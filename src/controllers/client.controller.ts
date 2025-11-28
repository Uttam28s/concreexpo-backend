import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Get all clients with pagination and filters
 */
export const getClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, typeId, isActive } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
        { primaryContact: { contains: search as string } },
      ];
    }

    if (typeId) {
      where.clientTypeId = typeId as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          clientType: true,
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      data: clients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

/**
 * Get single client by ID
 */
export const getClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        clientType: true,
        _count: {
          select: {
            appointments: true,
            inventoryTransactions: true,
            workerVisits: true,
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
};

/**
 * Create new client
 */
export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      address,
      primaryContact,
      clientTypeId,
      secondaryContact,
    } = req.body;

    // Validate required fields (only name and primaryContact are required)
    if (!name || !primaryContact) {
      res.status(400).json({ error: 'Name and primary contact are required' });
      return;
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(primaryContact.replace(/\D/g, ''))) {
      res.status(400).json({ error: 'Invalid primary contact number' });
      return;
    }

    // Check if client type exists (if provided)
    if (clientTypeId) {
      const clientType = await prisma.clientType.findUnique({
        where: { id: clientTypeId },
      });

      if (!clientType) {
        res.status(404).json({ error: 'Client type not found' });
        return;
      }
    }

    const client = await prisma.client.create({
      data: {
        name,
        address,
        primaryContact,
        clientTypeId,
        secondaryContact,
      },
      include: {
        clientType: true,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
};

/**
 * Update client
 */
export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      primaryContact,
      clientTypeId,
      secondaryContact,
      isActive,
    } = req.body;

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Validate phone if provided
    if (primaryContact && !/^\d{10}$/.test(primaryContact.replace(/\D/g, ''))) {
      res.status(400).json({ error: 'Invalid primary contact number' });
      return;
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        address,
        primaryContact,
        clientTypeId,
        secondaryContact,
        isActive,
      },
      include: {
        clientType: true,
      },
    });

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
};

/**
 * Delete client (soft delete)
 */
export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appointments: true,
            inventoryTransactions: true,
            workerVisits: true,
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Check if client has related data
    const hasRelatedData =
      client._count.appointments > 0 ||
      client._count.inventoryTransactions > 0 ||
      client._count.workerVisits > 0;

    if (hasRelatedData) {
      // Soft delete
      await prisma.client.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ message: 'Client deactivated successfully' });
    } else {
      // Hard delete if no related data
      await prisma.client.delete({
        where: { id },
      });

      res.json({ message: 'Client deleted successfully' });
    }
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
};

/**
 * Get all client types
 */
export const getClientTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.clientType.findMany({
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ data: types });
  } catch (error) {
    console.error('Get client types error:', error);
    res.status(500).json({ error: 'Failed to fetch client types' });
  }
};

/**
 * Create new client type
 */
export const createClientType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Check for duplicate
    const existing = await prisma.clientType.findUnique({
      where: { name },
    });

    if (existing) {
      res.status(409).json({ error: 'Client type already exists' });
      return;
    }

    const type = await prisma.clientType.create({
      data: { name },
    });

    res.status(201).json(type);
  } catch (error) {
    console.error('Create client type error:', error);
    res.status(500).json({ error: 'Failed to create client type' });
  }
};
