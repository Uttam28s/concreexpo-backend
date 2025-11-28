import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Stock In - Record material received
 */
export const stockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId, quantity, transactionDate, remarks, appointmentId } = req.body;
    const userId = req.user?.userId;

    if (!materialId || !quantity || !transactionDate) {
      res.status(400).json({ error: 'Material, quantity, and date are required' });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({ error: 'Quantity must be positive' });
      return;
    }

    // Verify material exists and is active
    const material = await prisma.material.findFirst({
      where: { id: materialId, isActive: true },
    });

    if (!material) {
      res.status(404).json({ error: 'Material not found or inactive' });
      return;
    }

    // Verify appointment exists if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }
    }

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        materialId,
        transactionType: 'STOCK_IN',
        quantity: Number(quantity),
        transactionDate: new Date(transactionDate),
        remarks,
        createdBy: userId!,
        appointmentId,
      },
      include: {
        material: true,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Stock in error:', error);
    res.status(500).json({ error: 'Failed to record stock in' });
  }
};

/**
 * Stock Out - Record material dispatched
 */
export const stockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId, clientId, siteAddress, quantity, transactionDate, remarks, appointmentId } = req.body;
    const userId = req.user?.userId;

    if (!materialId || !quantity || !transactionDate) {
      res.status(400).json({ error: 'Material, quantity, and date are required' });
      return;
    }

    if (quantity <= 0) {
      res.status(400).json({ error: 'Quantity must be positive' });
      return;
    }

    // Verify material exists and is active
    const material = await prisma.material.findFirst({
      where: { id: materialId, isActive: true },
    });

    if (!material) {
      res.status(404).json({ error: 'Material not found or inactive' });
      return;
    }

    // Verify client exists and is active (if provided)
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, isActive: true },
      });

      if (!client) {
        res.status(404).json({ error: 'Client not found or inactive' });
        return;
      }
    }

    // Verify appointment exists if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }
    }

    // Calculate current stock
    const stockIn = await prisma.inventoryTransaction.aggregate({
      where: { materialId, transactionType: 'STOCK_IN' },
      _sum: { quantity: true },
    });

    const stockOut = await prisma.inventoryTransaction.aggregate({
      where: { materialId, transactionType: 'STOCK_OUT' },
      _sum: { quantity: true },
    });

    const currentStock = (stockIn._sum.quantity || 0) - (stockOut._sum.quantity || 0);

    // Warning if quantity exceeds stock (but allow transaction)
    const warning = quantity > currentStock
      ? `Warning: This exceeds available stock by ${quantity - currentStock} buckets`
      : null;

    // Create transaction
    const transaction = await prisma.inventoryTransaction.create({
      data: {
        materialId,
        clientId,
        siteAddress,
        transactionType: 'STOCK_OUT',
        quantity: Number(quantity),
        transactionDate: new Date(transactionDate),
        remarks,
        createdBy: userId!,
        appointmentId,
      },
      include: {
        material: true,
        client: true,
      },
    });

    res.status(201).json({
      transaction,
      warning,
      currentStock: currentStock - quantity,
    });
  } catch (error) {
    console.error('Stock out error:', error);
    res.status(500).json({ error: 'Failed to record stock out' });
  }
};

/**
 * Get current stock levels for all materials
 */
export const getStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { materialId } = req.query;

    const where: any = { isActive: true };
    if (materialId) {
      where.id = materialId as string;
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const stockLevels = await Promise.all(
      materials.map(async (material) => {
        const stockIn = await prisma.inventoryTransaction.aggregate({
          where: { materialId: material.id, transactionType: 'STOCK_IN' },
          _sum: { quantity: true },
        });

        const stockOut = await prisma.inventoryTransaction.aggregate({
          where: { materialId: material.id, transactionType: 'STOCK_OUT' },
          _sum: { quantity: true },
        });

        const totalIn = stockIn._sum.quantity || 0;
        const totalOut = stockOut._sum.quantity || 0;
        const currentStock = totalIn - totalOut;
        const isLowStock = material.reorderLevel ? currentStock < material.reorderLevel : false;

        return {
          materialId: material.id,
          material: material,
          currentStock,
          isLowStock,
          totalIn,
          totalOut,
        };
      })
    );

    res.json({ data: stockLevels });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
};

/**
 * Get transaction history
 */
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      materialId,
      clientId,
      type,
      dateFrom,
      dateTo,
    } = req.query;

    const where: any = {};

    if (materialId) {
      where.materialId = materialId as string;
    }

    if (clientId) {
      where.clientId = clientId as string;
    }

    if (type) {
      where.transactionType = type as string;
    }

    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) {
        where.transactionDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.transactionDate.lte = new Date(dateTo as string);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: {
          material: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          createdByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: [
          { transactionDate: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    res.json({
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stock in
    const todayStockIn = await prisma.inventoryTransaction.aggregate({
      where: {
        transactionType: 'STOCK_IN',
        transactionDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: { quantity: true },
    });

    // Today's stock out
    const todayStockOut = await prisma.inventoryTransaction.aggregate({
      where: {
        transactionType: 'STOCK_OUT',
        transactionDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: { quantity: true },
    });

    // Get all materials with stock levels
    const materials = await prisma.material.findMany({
      where: { isActive: true },
    });

    let totalStock = 0;
    let lowStockCount = 0;

    for (const material of materials) {
      const stockIn = await prisma.inventoryTransaction.aggregate({
        where: { materialId: material.id, transactionType: 'STOCK_IN' },
        _sum: { quantity: true },
      });

      const stockOut = await prisma.inventoryTransaction.aggregate({
        where: { materialId: material.id, transactionType: 'STOCK_OUT' },
        _sum: { quantity: true },
      });

      const currentStock = (stockIn._sum.quantity || 0) - (stockOut._sum.quantity || 0);
      totalStock += currentStock;

      if (material.reorderLevel && currentStock < material.reorderLevel) {
        lowStockCount++;
      }
    }

    res.json({
      totalStock,
      todayStockIn: todayStockIn._sum.quantity || 0,
      todayStockOut: todayStockOut._sum.quantity || 0,
      lowStockItems: lowStockCount,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

/**
 * Get material usage report by timeframe
 */
export const getUsageReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, materialIds } = req.query;

    const where: any = {};

    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) {
        where.transactionDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.transactionDate.lte = new Date(dateTo as string);
      }
    }

    if (materialIds) {
      const ids = (materialIds as string).split(',');
      where.materialId = { in: ids };
    }

    // Get all transactions in period
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        material: true,
      },
    });

    // Group by material
    const usage: Record<string, any> = {};

    transactions.forEach((transaction) => {
      const materialId = transaction.materialId;
      if (!usage[materialId]) {
        usage[materialId] = {
          materialId,
          materialName: transaction.material.name,
          stockIn: 0,
          stockOut: 0,
          netChange: 0,
        };
      }

      if (transaction.transactionType === 'STOCK_IN') {
        usage[materialId].stockIn += transaction.quantity;
        usage[materialId].netChange += transaction.quantity;
      } else {
        usage[materialId].stockOut += transaction.quantity;
        usage[materialId].netChange -= transaction.quantity;
      }
    });

    // Calculate current balance for each
    const report = await Promise.all(
      Object.values(usage).map(async (item: any) => {
        const stockIn = await prisma.inventoryTransaction.aggregate({
          where: { materialId: item.materialId, transactionType: 'STOCK_IN' },
          _sum: { quantity: true },
        });

        const stockOut = await prisma.inventoryTransaction.aggregate({
          where: { materialId: item.materialId, transactionType: 'STOCK_OUT' },
          _sum: { quantity: true },
        });

        const currentBalance = (stockIn._sum.quantity || 0) - (stockOut._sum.quantity || 0);
        const totalIn = stockIn._sum.quantity || 0;
        const utilizationRate = totalIn > 0 ? ((stockOut._sum.quantity || 0) / totalIn * 100) : 0;

        return {
          ...item,
          currentBalance,
          utilizationRate: Math.round(utilizationRate),
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error('Get usage report error:', error);
    res.status(500).json({ error: 'Failed to generate usage report' });
  }
};

/**
 * Get material usage by site/client
 */
export const getBySiteReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientIds, dateFrom, dateTo, materialIds } = req.query;

    const where: any = {
      transactionType: 'STOCK_OUT',
      clientId: { not: null },
    };

    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) {
        where.transactionDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.transactionDate.lte = new Date(dateTo as string);
      }
    }

    if (clientIds) {
      const ids = (clientIds as string).split(',');
      where.clientId = { in: ids };
    }

    if (materialIds) {
      const ids = (materialIds as string).split(',');
      where.materialId = { in: ids };
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        material: true,
        client: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    });

    // Group by client and material
    const usage: Record<string, any> = {};

    transactions.forEach((transaction) => {
      const clientId = transaction.clientId!;
      const materialId = transaction.materialId;
      const key = `${clientId}-${materialId}`;

      if (!usage[key]) {
        usage[key] = {
          clientId,
          clientName: transaction.client?.name,
          materialId,
          materialName: transaction.material.name,
          totalBuckets: 0,
          dispatchCount: 0,
          lastDispatchDate: transaction.transactionDate,
        };
      }

      usage[key].totalBuckets += transaction.quantity;
      usage[key].dispatchCount += 1;

      if (transaction.transactionDate > usage[key].lastDispatchDate) {
        usage[key].lastDispatchDate = transaction.transactionDate;
      }
    });

    res.json(Object.values(usage));
  } catch (error) {
    console.error('Get by site report error:', error);
    res.status(500).json({ error: 'Failed to generate site report' });
  }
};

/**
 * Get stock balance report
 */
export const getBalanceReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const report = await Promise.all(
      materials.map(async (material) => {
        const [stockIn, stockOut, lastStockIn, lastStockOut] = await Promise.all([
          prisma.inventoryTransaction.aggregate({
            where: { materialId: material.id, transactionType: 'STOCK_IN' },
            _sum: { quantity: true },
          }),
          prisma.inventoryTransaction.aggregate({
            where: { materialId: material.id, transactionType: 'STOCK_OUT' },
            _sum: { quantity: true },
          }),
          prisma.inventoryTransaction.findFirst({
            where: { materialId: material.id, transactionType: 'STOCK_IN' },
            orderBy: { transactionDate: 'desc' },
            select: { transactionDate: true },
          }),
          prisma.inventoryTransaction.findFirst({
            where: { materialId: material.id, transactionType: 'STOCK_OUT' },
            orderBy: { transactionDate: 'desc' },
            select: { transactionDate: true },
          }),
        ]);

        const currentStock = (stockIn._sum.quantity || 0) - (stockOut._sum.quantity || 0);
        const reorderLevel = material.reorderLevel || 0;

        let status: 'low' | 'medium' | 'good';
        if (currentStock < reorderLevel) {
          status = 'low';
        } else if (currentStock < reorderLevel + 10) {
          status = 'medium';
        } else {
          status = 'good';
        }

        return {
          materialId: material.id,
          materialName: material.name,
          currentStock,
          reorderLevel,
          status,
          lastStockIn: lastStockIn?.transactionDate,
          lastStockOut: lastStockOut?.transactionDate,
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error('Get balance report error:', error);
    res.status(500).json({ error: 'Failed to generate balance report' });
  }
};
