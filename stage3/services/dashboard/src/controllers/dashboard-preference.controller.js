/**
 * Dashboard Preference Controller
 * 
 * Handles operations related to user dashboard preferences
 */

const DashboardPreference = require('../models/dashboard-preference');
const logger = require('../utils/logger');

/**
 * Get dashboard preference by ID
 */
exports.getDashboardPreference = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const preference = await DashboardPreference.findById(id);
    
    if (!preference) {
      return res.status(404).json({
        error: {
          code: 'DASHBOARD_NOT_FOUND',
          message: 'Dashboard preference not found'
        }
      });
    }
    
    // Check if user has access to this dashboard
    if (preference.userId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this dashboard'
        }
      });
    }
    
    return res.json(preference);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get user dashboard preferences
 */
exports.getUserDashboardPreferences = async (req, res, next) => {
  try {
    const { dashboardType } = req.query;
    const userId = req.user.id;
    
    // Build query
    const query = { userId };
    
    if (dashboardType) {
      query.dashboardType = dashboardType;
    }
    
    const preferences = await DashboardPreference.find(query);
    
    return res.json({
      data: preferences,
      meta: {
        count: preferences.length
      }
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Create a new dashboard preference
 */
exports.createDashboardPreference = async (req, res, next) => {
  try {
    const { dashboardType, name, layoutType, widgets, settings } = req.body;
    const userId = req.user.id;
    
    // Create new dashboard preference
    const newPreference = new DashboardPreference({
      userId,
      dashboardType,
      name,
      layoutType,
      widgets,
      settings
    });
    
    await newPreference.save();
    
    return res.status(201).json(newPreference);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a dashboard preference
 */
exports.updateDashboardPreference = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, layoutType, widgets, settings } = req.body;
    
    // Find existing preference
    const preference = await DashboardPreference.findById(id);
    
    if (!preference) {
      return res.status(404).json({
        error: {
          code: 'DASHBOARD_NOT_FOUND',
          message: 'Dashboard preference not found'
        }
      });
    }
    
    // Check if user has access to update this dashboard
    if (preference.userId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this dashboard'
        }
      });
    }
    
    // Cannot update system dashboards
    if (preference.isSystem) {
      return res.status(403).json({
        error: {
          code: 'SYSTEM_DASHBOARD',
          message: 'System dashboards cannot be modified'
        }
      });
    }
    
    // Update fields
    if (name !== undefined) preference.name = name;
    if (layoutType !== undefined) preference.layoutType = layoutType;
    if (widgets !== undefined) preference.widgets = widgets;
    if (settings !== undefined) preference.settings = settings;
    
    await preference.save();
    
    return res.json(preference);
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete a dashboard preference
 */
exports.deleteDashboardPreference = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find existing preference
    const preference = await DashboardPreference.findById(id);
    
    if (!preference) {
      return res.status(404).json({
        error: {
          code: 'DASHBOARD_NOT_FOUND',
          message: 'Dashboard preference not found'
        }
      });
    }
    
    // Check if user has access to delete this dashboard
    if (preference.userId !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this dashboard'
        }
      });
    }
    
    // Cannot delete system dashboards
    if (preference.isSystem) {
      return res.status(403).json({
        error: {
          code: 'SYSTEM_DASHBOARD',
          message: 'System dashboards cannot be deleted'
        }
      });
    }
    
    // Cannot delete default dashboards
    if (preference.isDefault) {
      return res.status(403).json({
        error: {
          code: 'DEFAULT_DASHBOARD',
          message: 'Default dashboards cannot be deleted. Set another dashboard as default first.'
        }
      });
    }
    
    await preference.remove();
    
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
};

/**
 * Set dashboard as default
 */
exports.setDefaultDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Find the dashboard to set as default
    const preference = await DashboardPreference.findById(id);
    
    if (!preference) {
      return res.status(404).json({
        error: {
          code: 'DASHBOARD_NOT_FOUND',
          message: 'Dashboard preference not found'
        }
      });
    }
    
    // Check if user has access to update this dashboard
    if (preference.userId !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this dashboard'
        }
      });
    }
    
    // Remove default flag from all user dashboards of the same type
    await DashboardPreference.updateMany(
      { userId, dashboardType: preference.dashboardType },
      { isDefault: false }
    );
    
    // Set this dashboard as default
    preference.isDefault = true;
    await preference.save();
    
    return res.json(preference);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get default dashboard for user and type
 */
exports.getDefaultDashboard = async (req, res, next) => {
  try {
    const { dashboardType } = req.params;
    const userId = req.user.id;
    
    // Find default dashboard of specified type
    const preference = await DashboardPreference.findOne({
      userId,
      dashboardType,
      isDefault: true
    });
    
    if (!preference) {
      // Find system default instead
      const systemDefault = await DashboardPreference.findOne({
        dashboardType,
        isSystem: true
      });
      
      if (!systemDefault) {
        return res.status(404).json({
          error: {
            code: 'DASHBOARD_NOT_FOUND',
            message: 'No default dashboard found for this type'
          }
        });
      }
      
      return res.json(systemDefault);
    }
    
    return res.json(preference);
  } catch (error) {
    return next(error);
  }
};