import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Get all materials
 */
export const getMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;

    const where: any = {};

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: {
          _count: {
            select: {
              inventoryTransactions: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.material.count({ where }),
    ]);

    // Calculate current stock for each material
    const materialsWithStock = await Promise.all(
      materials.map(async (material) => {
        const stockIn = await prisma.inventoryTransaction.aggregate({
          where: {
            materialId: material.id,
            transactionType: 'STOCK_IN',
          },
          _sum: { quantity: true },
        });

        const stockOut = await prisma.inventoryTransaction.aggregate({
          where: {
            materialId: material.id,
            transactionType: 'STOCK_OUT',
          },
          _sum: { quantity: true },
        });

        const currentStock = (stockIn._sum.quantity || 0) - (stockOut._sum.quantity || 0);

        return {
          ...material,
          currentStock,
          isLowStock: material.reorderLevel ? currentStock < material.reorderLevel : false,
        };
      })
    );

    res.json({
      data: materialsWithStock,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

/**
 * Get material by ID
 */
export const getMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventoryTransactions: true,
          },
        },
      },
    });

    if (!material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    // Calculate current stock
    const stockIn = await prisma.inventoryTransaction.aggregate({
      where: {
        materialId: material.id,
        transactionType: 'STOCK_IN',
      },
      _sum: { quantity: true },
    });

    const stockOut = await prisma.inventoryTransaction.aggregate({
      where: {
        materialId: material.id,
        transactionType: 'STOCK_OUT',
      },
      _sum: { quantity: true },
    });

    const currentStock = (stockIn._sum.quantity || 0) - (stockOut._sum.quantity || 0);

    res.json({
      ...material,
      currentStock,
      isLowStock: material.reorderLevel ? currentStock < material.reorderLevel : false,
    });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

/**
 * Create new material
 */
export const createMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, reorderLevel } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Material name is required' });
      return;
    }

    const material = await prisma.material.create({
      data: {
        name,
        unit: 'Bucket', // Fixed unit
        reorderLevel: reorderLevel ? Number(reorderLevel) : null,
      },
    });

    res.status(201).json(material);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

/**
 * Update material
 */
export const updateMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, reorderLevel, isActive } = req.body;

    // Check if material exists
    const existing = await prisma.material.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    const material = await prisma.material.update({
      where: { id },
      data: {
        name,
        reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
        isActive,
      },
    });

    res.json(material);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

/**
 * Delete/deactivate material
 */
export const deleteMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if material exists
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventoryTransactions: true,
          },
        },
      },
    });

    if (!material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    // If material has transactions, deactivate and soft delete. Otherwise, delete
    if (material._count.inventoryTransactions > 0) {
      await prisma.material.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });
      res.json({ message: 'Material deactivated successfully' });
    } else {
      await prisma.material.delete({
        where: { id },
      });
      res.json({ message: 'Material deleted successfully' });
    }
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};
