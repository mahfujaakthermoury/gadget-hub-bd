import { ObjectId } from "mongodb";
import { normalizeOrder } from "./orderController.js";
import { getOrdersCollection } from "../models/orders.js";
import { getUsersCollection } from "../models/users.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateId(value) {
  if (!/^[\da-f]{24}$/iu.test(value)) throw httpError(400, "Invalid customer ID.");
  return new ObjectId(value);
}

function pageNumber(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw httpError(400, "Invalid pagination values.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw httpError(400, "Invalid pagination values.");
  }
  return number;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function safeCustomer(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function createCustomerController({
  loadUsers = getUsersCollection,
  loadOrders = getOrdersCollection,
} = {}) {
  return {
    listCustomers: async (request, response, next) => {
      try {
        const page = pageNumber(request.query.page, 1, 1_000_000);
        const limit = pageNumber(request.query.limit, 20, 100);
        const filter = { role: "customer" };
        if (request.query.active === "true") filter.isActive = true;
        if (request.query.active === "false") filter.isActive = false;
        if (request.query.search) {
          const search = escapeRegex(String(request.query.search).slice(0, 100));
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ];
        }
        const users = await loadUsers();
        const [items, total] = await Promise.all([
          users.find(
            filter,
            {
              projection: {
                passwordHash: 0,
                emailNormalized: 0,
              },
            },
          )
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          users.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(safeCustomer),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    getCustomer: async (request, response, next) => {
      try {
        const id = validateId(request.params.id);
        const users = await loadUsers();
        const user = await users.findOne(
          { _id: id, role: "customer" },
          {
            projection: {
              passwordHash: 0,
              emailNormalized: 0,
            },
          },
        );
        if (!user) throw httpError(404, "Customer not found.");
        const orders = await loadOrders();
        const [orderCount, recentOrders] = await Promise.all([
          orders.countDocuments({ customerId: id }),
          orders.find({ customerId: id })
            .sort({ createdAt: -1, _id: -1 })
            .limit(5)
            .toArray(),
        ]);
        response.status(200).json({
          success: true,
          data: {
            ...safeCustomer(user),
            orderCount,
            recentOrders: recentOrders.map((order) => ({
              id: order._id.toString(),
              orderNumber: order.orderNumber,
              status: order.status,
              totalAmount: order.totalAmount,
              createdAt: order.createdAt,
            })),
          },
        });
      } catch (error) {
        next(error);
      }
    },
    listCustomerOrders: async (request, response, next) => {
      try {
        const id = validateId(request.params.id);
        const page = pageNumber(request.query.page, 1, 1_000_000);
        const limit = pageNumber(request.query.limit, 20, 100);
        const users = await loadUsers();
        const customer = await users.findOne(
          { _id: id, role: "customer" },
          { projection: { _id: 1 } },
        );
        if (!customer) throw httpError(404, "Customer not found.");
        const filter = { customerId: id };
        const orders = await loadOrders();
        const [items, total] = await Promise.all([
          orders.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          orders.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(normalizeOrder),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    updateCustomerStatus: async (request, response, next) => {
      try {
        const id = validateId(request.params.id);
        if (
          !request.body ||
          typeof request.body !== "object" ||
          Array.isArray(request.body) ||
          Object.keys(request.body).length !== 1 ||
          typeof request.body.isActive !== "boolean"
        ) {
          throw httpError(400, "isActive must be a boolean.");
        }
        if (request.user._id === id.toString()) {
          throw httpError(400, "You cannot deactivate your own administrator account.");
        }
        const users = await loadUsers();
        const result = await users.updateOne(
          { _id: id, role: "customer" },
          { $set: { isActive: request.body.isActive, updatedAt: new Date() } },
        );
        if (!result.matchedCount) throw httpError(404, "Customer not found.");
        const customer = await users.findOne(
          { _id: id },
          {
            projection: {
              passwordHash: 0,
              emailNormalized: 0,
            },
          },
        );
        response.status(200).json({ success: true, data: safeCustomer(customer) });
      } catch (error) {
        next(error);
      }
    },
  };
}
