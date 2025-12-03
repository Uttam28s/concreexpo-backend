import { Request, Response } from 'express';
import prisma from '../config/database';
import { generateOTP, getWorkerVisitOTPExpiry, isOTPExpired } from '../utils/otp';
import { sendWorkerCountOTPToClient, sendWorkerCountOTPToAdmin, normalizePhoneNumber } from '../services/sms.service';
import { format } from 'date-fns';
import { generateMSG91OTPToken, verifyMSG91OTPToken } from '../utils/jwt';
import axios from 'axios';
import { config } from '../config/env';
import ExcelJS from 'exceljs';

/**
 * Create worker visit and send dual OTP (Admin and Engineer)
 * Engineers can only create visits for themselves
 * Admins can create visits for any engineer
 */
export const createVisit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, engineerId, visitDate, siteAddress } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!clientId || !visitDate) {
      res.status(400).json({ error: 'Client and visit date are required' });
      return;
    }

    // Determine which engineer to assign
    // For engineers: always use their own ID
    // For admins: use provided engineerId or their own ID if not provided
    let targetEngineerId = userId;
    if (userRole === 'ADMIN' && engineerId) {
      targetEngineerId = engineerId;
    } else if (userRole === 'ENGINEER') {
      targetEngineerId = userId; // Engineers can only create visits for themselves
    }

    if (!targetEngineerId) {
      res.status(400).json({ error: 'Engineer ID is required' });
      return;
    }

    // Verify client exists and is active
    const client = await prisma.client.findFirst({
      where: { id: clientId, isActive: true },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found or inactive' });
      return;
    }

    // Get engineer details
    const engineer = await prisma.user.findFirst({
      where: {
        id: targetEngineerId,
        role: 'ENGINEER',
        isActive: true
      },
    });

    if (!engineer) {
      res.status(404).json({ error: 'Engineer not found or inactive' });
      return;
    }

    // Generate OTP (valid for 24 hours)
    const otp = generateOTP();
    const otpExpiry = getWorkerVisitOTPExpiry();

    // Create visit
    const visit = await prisma.workerVisit.create({
      data: {
        engineerId: targetEngineerId,
        clientId,
        visitDate: new Date(visitDate),
        siteAddress,
        otp,
        otpExpiresAt: otpExpiry,
        otpSentAt: new Date(),
        status: 'PENDING',
      },
      include: {
        client: true,
        engineer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Get admin phone from settings
    const adminPhoneSetting = await prisma.settings.findUnique({
      where: { key: 'admin_phone' },
    });

    const adminPhone = adminPhoneSetting?.value || process.env.ADMIN_PHONE || '';

    // Format date for SMS
    const dateStr = format(new Date(visitDate), 'MMM dd, yyyy');

    // Send OTP to client's primary contact
    await sendWorkerCountOTPToClient(
      client.primaryContact,
      otp,
      client.name,
      dateStr
    );

    // Send OTP to admin
    if (adminPhone) {
      await sendWorkerCountOTPToAdmin(
        adminPhone,
        otp,
        engineer.name,
        client.name,
        dateStr
      );
    }

    res.status(201).json({
      visit,
      message: 'Visit created and OTP sent to client and admin',
      otpSentTo: {
        client: client.primaryContact,
        admin: adminPhone || 'Not configured',
      },
      otpExpiresAt: otpExpiry,
    });
  } catch (error) {
    console.error('Create visit error:', error);
    res.status(500).json({ error: 'Failed to create visit' });
  }
};

/**
 * Resend OTP for worker visit (Engineer only)
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const visit = await prisma.workerVisit.findUnique({
      where: { id },
      include: {
        client: true,
        engineer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!visit) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Verify engineer owns this visit
    if (visit.engineerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if already completed
    if (visit.status === 'COMPLETED') {
      res.status(400).json({ error: 'Worker count already submitted for this visit' });
      return;
    }

    // Rate limiting: Check if OTP was sent recently (within last 60 seconds)
    if (visit.otpSentAt) {
      const timeSinceLastOTP = Date.now() - new Date(visit.otpSentAt).getTime();
      const cooldownPeriod = 60 * 1000; // 60 seconds

      if (timeSinceLastOTP < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastOTP) / 1000);
        res.status(429).json({ 
          error: `Please wait ${remainingSeconds} seconds before requesting a new OTP`,
          retryAfter: remainingSeconds
        });
        return;
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = getWorkerVisitOTPExpiry();

    // Get admin phone from settings
    const adminPhoneSetting = await prisma.settings.findUnique({
      where: { key: 'admin_phone' },
    });

    const adminPhone = adminPhoneSetting?.value || process.env.ADMIN_PHONE || '';

    // Format date for SMS
    const dateStr = format(new Date(visit.visitDate), 'MMM dd, yyyy');

    // Send OTP to client's primary contact
    const clientOtpSent = await sendWorkerCountOTPToClient(
      visit.client.primaryContact,
      otp,
      visit.client.name,
      dateStr
    );

    // Send OTP to admin
    let adminOtpSent = false;
    if (adminPhone) {
      adminOtpSent = await sendWorkerCountOTPToAdmin(
        adminPhone,
        otp,
        visit.engineer.name,
        visit.client.name,
        dateStr
      );
    }

    // Only update if at least client OTP was sent
    if (!clientOtpSent) {
      console.error(`Failed to resend OTP to client ${visit.client.primaryContact} for visit ${id}`);
      res.status(500).json({ 
        error: 'Failed to resend OTP. Please check the phone number and SMS configuration.',
        sentTo: {
          client: visit.client.primaryContact,
          admin: adminPhone || 'Not configured',
        }
      });
      return;
    }

    // Update visit with new OTP
    await prisma.workerVisit.update({
      where: { id },
      data: {
        otp,
        otpExpiresAt: otpExpiry,
        otpSentAt: new Date(),
        status: 'PENDING',
      },
    });

    res.json({
      message: 'OTP resent successfully',
      sentTo: {
        client: visit.client.primaryContact,
        admin: adminPhone || 'Not configured',
      },
      clientOtpSent,
      adminOtpSent: adminPhone ? adminOtpSent : null,
      expiresAt: otpExpiry,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};

/**
 * Generate MSG91 OTP Widget token for worker visit verification
 */
export const generateOTPWidgetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const visit = await prisma.workerVisit.findUnique({
      where: { id },
      include: {
        client: true,
        engineer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!visit) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Verify engineer owns this visit
    if (visit.engineerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if already completed
    if (visit.status === 'COMPLETED') {
      res.status(400).json({ error: 'Worker count already submitted for this visit' });
      return;
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(visit.client.primaryContact);
    if (!normalizedPhone) {
      res.status(400).json({ error: 'Invalid client phone number format' });
      return;
    }

    // Generate JWT token for MSG91 OTP widget
    const widgetToken = generateMSG91OTPToken({
      phone: normalizedPhone,
      visitId: visit.id,
      purpose: 'worker_visit',
      expiresIn: 24 * 60 * 60, // 24 hours
    });

    res.json({
      token: widgetToken,
      phone: normalizedPhone,
      expiresIn: 24 * 60 * 60, // seconds
    });
  } catch (error) {
    console.error('Generate OTP widget token error:', error);
    res.status(500).json({ error: 'Failed to generate OTP widget token' });
  }
};

/**
 * Submit worker count with OTP verification using MSG91 widget (Engineer only)
 */
export const submitWorkerCountWithWidget = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { accessToken, workerCount, remarks } = req.body; // accessToken from MSG91 widget
    const userId = req.user?.userId;

    if (!accessToken || !workerCount) {
      res.status(400).json({ error: 'Access token and worker count are required' });
      return;
    }

    if (workerCount <= 0) {
      res.status(400).json({ error: 'Worker count must be positive' });
      return;
    }

    // Verify the MSG91 widget token
    const tokenPayload = verifyMSG91OTPToken(accessToken);
    if (!tokenPayload || tokenPayload.visitId !== id) {
      res.status(400).json({ error: 'Invalid or expired access token' });
      return;
    }

    // Verify with MSG91 API
    const verifyResponse = await axios.post(
      'https://control.msg91.com/api/v5/widget/verifyAccessToken',
      {
        authkey: config.sms.msg91.authKey,
        'access-token': accessToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (verifyResponse.data.type !== 'success') {
      res.status(400).json({ 
        error: 'OTP verification failed',
        details: verifyResponse.data.message || 'Invalid OTP'
      });
      return;
    }

    // Get visit
    const visit = await prisma.workerVisit.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        engineer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!visit) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Verify engineer owns this visit
    if (visit.engineerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if already completed
    if (visit.status === 'COMPLETED') {
      res.status(400).json({ error: 'Worker count already submitted for this visit' });
      return;
    }

    // Update visit with worker count
    const updatedVisit = await prisma.workerVisit.update({
      where: { id },
      data: {
        workerCount: Number(workerCount),
        remarks,
        status: 'OTP_VERIFIED',
        verifiedAt: new Date(),
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        engineer: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'Worker count submitted successfully',
      visit: updatedVisit,
    });
  } catch (error: any) {
    console.error('Submit worker count with widget error:', error);
    if (error.response?.data) {
      res.status(400).json({ 
        error: 'OTP verification failed',
        details: error.response.data.message || 'Invalid OTP'
      });
    } else {
      res.status(500).json({ error: 'Failed to submit worker count' });
    }
  }
};

/**
 * Submit worker count with OTP verification (Engineer only)
 */
export const submitWorkerCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { otp, workerCount, remarks } = req.body;
    const userId = req.user?.userId;

    if (!otp || !workerCount) {
      res.status(400).json({ error: 'OTP and worker count are required' });
      return;
    }

    if (workerCount <= 0) {
      res.status(400).json({ error: 'Worker count must be positive' });
      return;
    }

    // Get visit
    const visit = await prisma.workerVisit.findUnique({
      where: { id },
      include: {
        client: true,
        engineer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!visit) {
      res.status(404).json({ error: 'Visit not found' });
      return;
    }

    // Verify engineer owns this visit
    if (visit.engineerId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if already completed
    if (visit.status === 'COMPLETED') {
      res.status(400).json({ error: 'Worker count already submitted for this visit' });
      return;
    }

    // Check if OTP expired (24 hours)
    if (!visit.otpExpiresAt || isOTPExpired(visit.otpExpiresAt)) {
      res.status(400).json({ error: 'OTP has expired. Please create a new visit.' });
      return;
    }

    // Verify OTP (no attempt limit for worker visits)
    // Allow "000000" as a test OTP for development/testing
    if (visit.otp !== otp && otp !== '000000') {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    // Update visit with worker count
    const updatedVisit = await prisma.workerVisit.update({
      where: { id },
      data: {
        workerCount: Number(workerCount),
        remarks,
        status: 'OTP_VERIFIED',
        verifiedAt: new Date(),
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        engineer: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      message: 'Worker count submitted successfully',
      visit: updatedVisit,
    });
  } catch (error) {
    console.error('Submit worker count error:', error);
    res.status(500).json({ error: 'Failed to submit worker count' });
  }
};

/**
 * Get pending visits for engineer
 */
export const getPendingVisits = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const visits = await prisma.workerVisit.findMany({
      where: {
        engineerId: userId,
        status: 'PENDING',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    res.json({ data: visits });
  } catch (error) {
    console.error('Get pending visits error:', error);
    res.status(500).json({ error: 'Failed to fetch pending visits' });
  }
};

/**
 * Get completed visits for engineer
 */
export const getCompletedVisits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, dateFrom, dateTo, clientId } = req.query;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const where: any = {
      status: { in: ['OTP_VERIFIED', 'COMPLETED'] },
    };

    // Engineers see only their own visits
    if (userRole === 'ENGINEER') {
      where.engineerId = userId;
    }

    if (dateFrom || dateTo) {
      where.visitDate = {};
      if (dateFrom) {
        where.visitDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.visitDate.lte = new Date(dateTo as string);
      }
    }

    if (clientId) {
      where.clientId = clientId as string;
    }

    const [visits, total] = await Promise.all([
      prisma.workerVisit.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          engineer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          visitDate: 'desc',
        },
      }),
      prisma.workerVisit.count({ where }),
    ]);

    res.json({
      data: visits,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get completed visits error:', error);
    res.status(500).json({ error: 'Failed to fetch completed visits' });
  }
};

/**
 * Get all visits (Admin only)
 */
export const getAllVisits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, engineerId, clientId, dateFrom, dateTo } = req.query;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (engineerId) {
      where.engineerId = engineerId as string;
    }

    if (clientId) {
      where.clientId = clientId as string;
    }

    if (dateFrom || dateTo) {
      where.visitDate = {};
      if (dateFrom) {
        where.visitDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.visitDate.lte = new Date(dateTo as string);
      }
    }

    const [visits, total] = await Promise.all([
      prisma.workerVisit.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          engineer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: {
          visitDate: 'desc',
        },
      }),
      prisma.workerVisit.count({ where }),
    ]);

    res.json({
      data: visits,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all visits error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
};

/**
 * Engineer visit summary report (Admin only)
 */
export const getEngineerSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { engineerId, dateFrom, dateTo } = req.query;

    const where: any = {
      status: { in: ['OTP_VERIFIED', 'COMPLETED'] },
    };

    if (engineerId) {
      where.engineerId = engineerId as string;
    }

    if (dateFrom || dateTo) {
      where.visitDate = {};
      if (dateFrom) {
        where.visitDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.visitDate.lte = new Date(dateTo as string);
      }
    }

    const visits = await prisma.workerVisit.findMany({
      where,
      include: {
        engineer: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    // Group by engineer and client
    const summary: Record<string, any> = {};

    visits.forEach((visit) => {
      const key = `${visit.engineerId}-${visit.clientId}`;

      if (!summary[key]) {
        summary[key] = {
          engineerId: visit.engineerId,
          engineerName: visit.engineer.name,
          clientId: visit.clientId,
          clientName: visit.client.name,
          totalVisits: 0,
          totalWorkers: 0,
          avgWorkersPerVisit: 0,
          lastVisitDate: visit.visitDate,
        };
      }

      summary[key].totalVisits += 1;
      summary[key].totalWorkers += visit.workerCount || 0;

      if (visit.visitDate > summary[key].lastVisitDate) {
        summary[key].lastVisitDate = visit.visitDate;
      }
    });

    // Calculate averages
    const report = Object.values(summary).map((item: any) => ({
      ...item,
      avgWorkersPerVisit: Math.round(item.totalWorkers / item.totalVisits),
    }));

    res.json(report);
  } catch (error) {
    console.error('Get engineer summary error:', error);
    res.status(500).json({ error: 'Failed to generate engineer summary' });
  }
};

/**
 * Site-wise worker count report (Admin only)
 */
export const getSiteWiseSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId, dateFrom, dateTo } = req.query;

    const where: any = {
      status: { in: ['OTP_VERIFIED', 'COMPLETED'] },
    };

    if (clientId) {
      where.clientId = clientId as string;
    }

    if (dateFrom || dateTo) {
      where.visitDate = {};
      if (dateFrom) {
        where.visitDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.visitDate.lte = new Date(dateTo as string);
      }
    }

    const visits = await prisma.workerVisit.findMany({
      where,
      include: {
        engineer: {
          select: {
            name: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    // Group by client
    const summary: Record<string, any> = {};

    visits.forEach((visit) => {
      const clientId = visit.clientId;

      if (!summary[clientId]) {
        summary[clientId] = {
          clientId,
          clientName: visit.client.name,
          totalWorkingDays: 0,
          totalWorkerDays: 0,
          avgWorkersPerDay: 0,
          visits: [],
        };
      }

      summary[clientId].totalWorkingDays += 1;
      summary[clientId].totalWorkerDays += visit.workerCount || 0;
      summary[clientId].visits.push({
        date: visit.visitDate,
        engineerName: visit.engineer.name,
        workers: visit.workerCount,
        remarks: visit.remarks,
        verifiedAt: visit.verifiedAt,
      });
    });

    // Calculate averages and payment
    const report = Object.values(summary).map((item: any) => ({
      clientId: item.clientId,
      clientName: item.clientName,
      totalWorkingDays: item.totalWorkingDays,
      totalWorkerDays: item.totalWorkerDays,
      avgWorkersPerDay: Math.round(item.totalWorkerDays / item.totalWorkingDays),
      visits: item.visits,
    }));

    res.json(report);
  } catch (error) {
    console.error('Get site-wise summary error:', error);
    res.status(500).json({ error: 'Failed to generate site-wise summary' });
  }
};

/**
 * Date-wise worker analysis (Admin only)
 */
export const getDateWiseAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      res.status(400).json({ error: 'Month and year are required' });
      return;
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const visits = await prisma.workerVisit.findMany({
      where: {
        status: { in: ['OTP_VERIFIED', 'COMPLETED'] },
        visitDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        engineer: {
          select: {
            name: true,
          },
        },
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        visitDate: 'asc',
      },
    });

    // Group by date
    const dateWise: Record<string, any> = {};

    visits.forEach((visit) => {
      const dateKey = format(visit.visitDate, 'yyyy-MM-dd');

      if (!dateWise[dateKey]) {
        dateWise[dateKey] = {
          date: visit.visitDate,
          sites: [],
          totalSites: 0,
          verifiedSites: 0,
          totalWorkers: 0,
        };
      }

      dateWise[dateKey].sites.push({
        clientName: visit.client.name,
        engineerName: visit.engineer.name,
        workers: visit.workerCount,
        status: 'Completed',
      });

      dateWise[dateKey].totalSites += 1;
      dateWise[dateKey].verifiedSites += 1;
      dateWise[dateKey].totalWorkers += visit.workerCount || 0;
    });

    res.json(Object.values(dateWise));
  } catch (error) {
    console.error('Get date-wise analysis error:', error);
    res.status(500).json({ error: 'Failed to generate date-wise analysis' });
  }
};

/**
 * Export worker visits to Excel
 */
export const exportWorkerVisits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) {
        where.visitDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.visitDate.lte = new Date(endDate as string);
      }
    }

    const visits = await prisma.workerVisit.findMany({
      where,
      include: {
        engineer: {
          select: {
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
        client: {
          select: {
            name: true,
            primaryContact: true,
            address: true,
          },
        },
      },
      orderBy: {
        visitDate: 'desc',
      },
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Worker Visits');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Client Name', key: 'clientName', width: 25 },
      { header: 'Client Contact', key: 'clientContact', width: 20 },
      { header: 'Engineer Name', key: 'engineerName', width: 25 },
      { header: 'Engineer Email', key: 'engineerEmail', width: 30 },
      { header: 'Visit Date', key: 'visitDate', width: 20 },
      { header: 'Site Address', key: 'siteAddress', width: 40 },
      { header: 'Worker Count', key: 'workerCount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'OTP Sent At', key: 'otpSentAt', width: 20 },
      { header: 'Verified At', key: 'verifiedAt', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 40 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    visits.forEach((visit) => {
      worksheet.addRow({
        id: visit.id,
        clientName: visit.client.name,
        clientContact: visit.client.primaryContact || '',
        engineerName: visit.engineer.name,
        engineerEmail: visit.engineer.email,
        visitDate: format(visit.visitDate, 'yyyy-MM-dd HH:mm'),
        siteAddress: visit.siteAddress || '',
        workerCount: visit.workerCount || 0,
        status: visit.status,
        otpSentAt: visit.otpSentAt ? format(visit.otpSentAt, 'yyyy-MM-dd HH:mm') : '',
        verifiedAt: visit.verifiedAt ? format(visit.verifiedAt, 'yyyy-MM-dd HH:mm') : '',
        remarks: visit.remarks || '',
        createdAt: format(visit.createdAt, 'yyyy-MM-dd HH:mm'),
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=worker_visits_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export worker visits error:', error);
    res.status(500).json({ error: 'Failed to export worker visits' });
  }
};
