/**
 * Role Controller
 * 
 * Handles role management operations
 */

const { Role, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Get all roles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      message: 'Roles retrieved successfully',
      data: { roles }
    });
  } catch (error) {
    logger.error(`Error in getAllRoles: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get roles',
      error: error.message
    });
  }
};

/**
 * Get role by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRoleById = async (req, res) => {
  try {
    const roleId = req.params.roleId;
    
    const role = await Role.findById(roleId);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Role retrieved successfully',
      data: { role }
    });
  } catch (error) {
    logger.error(`Error in getRoleById: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get role',
      error: error.message
    });
  }
};

/**
 * Create a new role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }
    
    // Check if role with name already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    
    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: 'Role with this name already exists'
      });
    }
    
    // Create new role
    const role = new Role({
      name: name.toLowerCase(),
      description,
      permissions: permissions || []
    });
    
    await role.save();
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role }
    });
  } catch (error) {
    logger.error(`Error in createRole: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
      error: error.message
    });
  }
};

/**
 * Update a role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateRole = async (req, res) => {
  try {
    const roleId = req.params.roleId;
    const { description, permissions } = req.body;
    
    // Find role by ID
    const role = await Role.findById(roleId);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    // Prevent updating system roles (admin, manager, staff)
    if (['admin', 'manager', 'staff'].includes(role.name) && role.name !== req.body.name) {
      return res.status(403).json({
        success: false,
        message: 'Cannot update system role name'
      });
    }
    
    // Update role fields if provided
    if (description) role.description = description;
    if (permissions) role.permissions = permissions;
    
    await role.save();
    
    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: { role }
    });
  } catch (error) {
    logger.error(`Error in updateRole: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
      error: error.message
    });
  }
};

/**
 * Delete a role
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteRole = async (req, res) => {
  try {
    const roleId = req.params.roleId;
    
    // Find role by ID
    const role = await Role.findById(roleId);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    // Prevent deleting system roles (admin, manager, staff)
    if (['admin', 'manager', 'staff'].includes(role.name)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system role'
      });
    }
    
    // Check if role is assigned to any user
    const usersWithRole = await User.countDocuments({ role: role.name });
    
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role assigned to ${usersWithRole} user(s)`
      });
    }
    
    await role.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error(`Error in deleteRole: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
      error: error.message
    });
  }
};