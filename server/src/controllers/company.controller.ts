import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Company } from '../models/Company';
import { User, UserStatus } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}


export const createCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { name, description, profileUrl } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Valid company name is required' });
      return;
    }

    const newCompany = await Company.create({
      name: name.trim(),
      description: description?.trim(),
      profileUrl: profileUrl?.trim(),
      agents: [new Types.ObjectId(userId)],
      documents: [],
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: newCompany,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'INternal Server Error In Company Creation', error: error.message });
  }
};


export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params as { companyId: string };

    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ success: false, message: 'Invalid company ID format' });
      return;
    }

    const company = await Company.findById(companyId)
      .select('-__v')
      .populate('agents', 'name email status');

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const responsePayload = {
      id: company._id,
      name: company.name,
      description: company.description,
      profileUrl: company.profileUrl,
      agentsCount: company.agents.length,
      documentsCount: company.documents.length,
      agents: company.agents,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: responsePayload,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve company', error: error.message });
  }
};


export const updateCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params as {companyId : string};
    const { name, description, profileUrl } = req.body;

    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ success: false, message: 'Invalid company ID format' });
      return;
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (profileUrl !== undefined) updates.profileUrl = profileUrl.trim();

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields provided for update' });
      return;
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedCompany) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update company', error: error.message });
  }
};


export const addAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params as {companyId: string};
    const { agentEmail } = req.body;

    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ success: false, message: 'Invalid company ID format' });
      return;
    }

    if (!agentEmail || typeof agentEmail !== 'string') {
      res.status(400).json({ success: false, message: 'Valid agent email is required' });
      return;
    }

    const user = await User.findOne({ email: agentEmail.toLowerCase().trim() });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found with provided email' });
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      res.status(400).json({ success: false, message: 'Cannot assign inactive or suspended user as agent' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const alreadyAssigned = company.agents.some((id) => id.toString() === user._id.toString());
    if (alreadyAssigned) {
      res.status(409).json({ success: false, message: 'User is already an agent of this company' });
      return;
    }

    company.agents.push(user._id as Types.ObjectId);
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Agent added successfully',
      data: {
        companyId: company._id,
        agentId: user._id,
        agentEmail: user.email,
        totalAgents: company.agents.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add agent', error: error.message });
  }
};


export const removeAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyId, agentId } = req.params as {companyId: string, agentId: string};

    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(agentId)) {
      res.status(400).json({ success: false, message: 'Invalid company or agent ID format' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    const agentIndex = company.agents.findIndex((id) => id.toString() === agentId);
    if (agentIndex === -1) {
      res.status(404).json({ success: false, message: 'Agent not found in this company' });
      return;
    }


    company.agents.splice(agentIndex, 1);
    await company.save();

    res.status(200).json({
      success: true,
      message: 'Agent removed successfully',
      data: {
        companyId: company._id,
        removedAgentId: agentId,
        remainingAgents: company.agents.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to remove agent', error: error.message });
  }
};

/**
 * Lists all assigned agents for the company.
 */
export const getCompanyAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params as {companyId: string};

    if (!Types.ObjectId.isValid(companyId)) {
      res.status(400).json({ success: false, message: 'Invalid company ID format' });
      return;
    }

    const company = await Company.findById(companyId)
      .populate('agents', 'name email status createdAt')
      .select('name agents');

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        companyId: company._id,
        companyName: company.name,
        totalAgents: company.agents.length,
        agents: company.agents,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch company agents', error: error.message });
  }
};