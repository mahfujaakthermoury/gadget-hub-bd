import { getCategoriesCollection, getProductsCollection } from "../models/catalog.js";
import { getOrdersCollection } from "../models/orders.js";
import { getUsersCollection } from "../models/users.js";
import { getSettingsCollection } from "../models/settings.js";
import { getDefaultSettings } from "./settingsController.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function dateRange(query) {
  const to = query.to ? parseDate(query.to, "end", true) : new Date();
  const from = query.from
    ? parseDate(query.from, "start")
    : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (from > to) throw httpError(400, "Start date must not follow end date.");
  return { from, to };
}

function parseDate(value, field, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw httpError(400, `Invalid ${field} date.`);
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw httpError(400, `Invalid ${field} date.`);
  }
  return date;
}

function periodMatch(field, range) {
  return { [field]: { $gte: range.from, $lte: range.to } };
}

async function loadThreshold(loadSettings) {
  const collection = await loadSettings();
  const saved = await collection.findOne({ _id: "store-settings" });
  return saved?.store?.lowStockAlertThreshold ??
    getDefaultSettings().store.lowStockAlertThreshold;
}

async function aggregate(collection, pipeline) {
  return collection.aggregate(pipeline).toArray();
}

function revenuePipeline(range, { bucket } = {}) {
  const pipeline = [
    {
      $match: {
        paymentStatus: "paid",
        status: { $ne: "cancelled" },
        paymentVerifiedAt: { $type: "date" },
        ...periodMatch("paidAt", range),
      },
    },
  ];
  if (bucket) {
    pipeline.push({
      $group: {
        _id: { $dateToString: { format: bucket, date: "$paidAt", timezone: "Asia/Dhaka" } },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    });
    pipeline.push({ $sort: { _id: 1 } });
  } else {
    pipeline.push({
      $group: {
        _id: null,
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    });
  }
  return pipeline;
}

export function createAnalyticsController({
  loadOrders = getOrdersCollection,
  loadProducts = getProductsCollection,
  loadCategories = getCategoriesCollection,
  loadUsers = getUsersCollection,
  loadSettings = getSettingsCollection,
} = {}) {
  const getOverview = async (request, response, next) => {
    try {
      const range = dateRange(request.query);
      const [orders, products, categories, users, settings] = await Promise.all([
        loadOrders(),
        loadProducts(),
        loadCategories(),
        loadUsers(),
        loadThreshold(loadSettings),
      ]);
      const [revenue, orderCounts, monthlyRevenue, topProducts, lowStock, outOfStock, totalOrders, totalProducts, totalCategories, totalCustomers] =
        await Promise.all([
          aggregate(orders, revenuePipeline(range)),
          aggregate(orders, [
            { $match: periodMatch("createdAt", range) },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
          aggregate(orders, revenuePipeline(range, { bucket: "%Y-%m" })),
          aggregate(orders, [
            { $match: { status: { $ne: "cancelled" }, ...periodMatch("createdAt", range) } },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.productId",
                name: { $first: "$items.name" },
                quantity: { $sum: "$items.quantity" },
                revenue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$paymentStatus", "paid"] },
                          { $eq: [{ $type: "$paymentVerifiedAt" }, "date"] },
                        ],
                      },
                      "$items.lineTotal",
                      0,
                    ],
                  },
                },
              },
            },
            { $sort: { quantity: -1, name: 1 } },
            { $limit: 5 },
          ]),
          products.countDocuments({
            active: { $ne: false },
            stockQuantity: { $gt: 0, $lte: settings },
          }),
          products.countDocuments({
            active: { $ne: false },
            $or: [
              { stockQuantity: 0 },
              { stockQuantity: { $exists: false } },
              { stockQuantity: null },
            ],
          }),
          orders.countDocuments(periodMatch("createdAt", range)),
          products.countDocuments({ active: { $ne: false } }),
          categories.countDocuments({ active: { $ne: false } }),
          users.countDocuments({ role: "customer", isActive: { $ne: false } }),
        ]);
      const [lowStockProducts, outOfStockProducts] = await Promise.all([
        products.find({
          active: { $ne: false },
          stockQuantity: { $gt: 0, $lte: settings },
        }).sort({ stockQuantity: 1, name: 1 }).limit(10).toArray(),
        products.find({
          active: { $ne: false },
          $or: [
            { stockQuantity: 0 },
            { stockQuantity: { $exists: false } },
            { stockQuantity: null },
          ],
        }).sort({ name: 1 }).limit(10).toArray(),
      ]);
      response.status(200).json({
        success: true,
        data: {
          revenue: revenue[0]?.revenue || 0,
          verifiedPaidOrders: revenue[0]?.orders || 0,
          totalOrders,
          totalCustomers,
          totalProducts,
          totalCategories,
          threshold: settings,
          lowStockCount: lowStock,
          outOfStockCount: outOfStock,
          orderStatus: orderCounts.map(({ _id, count }) => ({ status: _id, count })),
          monthlyRevenue: monthlyRevenue.map(({ _id, revenue: amount, orders: count }) => ({
            month: _id,
            revenue: amount,
            orders: count,
          })),
          topProducts: topProducts.map(({ _id, ...item }) => ({
            productId: _id.toString(),
            ...item,
          })),
          lowStockProducts: lowStockProducts.map((product) => ({
            id: product._id.toString(),
            name: product.name,
            category: product.category,
            stockQuantity: product.stockQuantity,
          })),
          outOfStockProducts: outOfStockProducts.map((product) => ({
            id: product._id.toString(),
            name: product.name,
            category: product.category,
            stockQuantity: 0,
          })),
          range: { from: range.from, to: range.to },
          revenueDefinition:
            "Revenue includes only orders with paymentStatus paid, a verified payment timestamp, and a non-cancelled order status, grouped by payment date.",
        },
      });
    } catch (error) {
      next(error);
    }
  };

  return {
    overview: getOverview,
    sales: async (request, response, next) => {
      try {
        const range = dateRange(request.query);
        const orders = await loadOrders();
        const spanDays = Math.ceil((range.to - range.from) / 86_400_000);
        const bucket = spanDays > 92 ? "%Y-%m" : "%Y-%m-%d";
        const [trend, total] = await Promise.all([
          aggregate(orders, revenuePipeline(range, { bucket })),
          aggregate(orders, revenuePipeline(range)),
        ]);
        response.status(200).json({
          success: true,
          data: {
            trend: trend.map(({ _id, revenue, orders: count }) => ({
              period: _id,
              revenue,
              orders: count,
            })),
            totalRevenue: total[0]?.revenue || 0,
            paidOrders: total[0]?.orders || 0,
            range: { from: range.from, to: range.to },
          },
        });
      } catch (error) {
        next(error);
      }
    },
    orders: async (request, response, next) => {
      try {
        const range = dateRange(request.query);
        const orders = await loadOrders();
        const data = await aggregate(orders, [
          { $match: periodMatch("createdAt", range) },
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]);
        response.status(200).json({
          success: true,
          data: data.map(({ _id, count }) => ({ status: _id, count })),
          range: { from: range.from, to: range.to },
        });
      } catch (error) {
        next(error);
      }
    },
    topProducts: async (request, response, next) => {
      try {
        const range = dateRange(request.query);
        const orders = await loadOrders();
        const data = await aggregate(orders, [
          { $match: { status: { $ne: "cancelled" }, ...periodMatch("createdAt", range) } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.productId",
              name: { $first: "$items.name" },
              quantity: { $sum: "$items.quantity" },
              revenue: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$paymentStatus", "paid"] },
                        { $ne: [{ $type: "$paymentVerifiedAt" }, "missing"] },
                      ],
                    },
                    "$items.lineTotal",
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { quantity: -1, name: 1 } },
          { $limit: 20 },
        ]);
        response.status(200).json({
          success: true,
          data: data.map(({ _id, ...item }) => ({ productId: _id.toString(), ...item })),
          range: { from: range.from, to: range.to },
        });
      } catch (error) {
        next(error);
      }
    },
    inventory: async (_request, response, next) => {
      try {
        const [products, threshold] = await Promise.all([
          loadProducts(),
          loadThreshold(loadSettings),
        ]);
        const [lowStock, outOfStock, totalActive] = await Promise.all([
          products.countDocuments({
            active: { $ne: false },
            stockQuantity: { $gt: 0, $lte: threshold },
          }),
          products.countDocuments({
            active: { $ne: false },
            $or: [
              { stockQuantity: 0 },
              { stockQuantity: { $exists: false } },
              { stockQuantity: null },
            ],
          }),
          products.countDocuments({ active: { $ne: false } }),
        ]);
        response.status(200).json({
          success: true,
          data: {
            threshold,
            totalActive,
            lowStock,
            outOfStock,
            replenishmentRequired: lowStock + outOfStock,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}