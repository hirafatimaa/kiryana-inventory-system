/**
 * Export Controller
 * 
 * Handles exporting reports to different formats
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Convert a report to CSV format
 * @param {Array} data - The report data array
 * @param {Object} options - CSV export options
 * @returns {string} - CSV formatted string
 */
const convertToCSV = (data, options = {}) => {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Extract headers from first item
  const headers = options.headers || Object.keys(data[0]);
  
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      } else if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      } else {
        return value;
      }
    });
    
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
};

/**
 * Export report data in the requested format
 */
exports.exportReport = async (req, res, next) => {
  try {
    const { format } = req.query;
    const reportData = req.body;
    
    if (!reportData || !reportData.data) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REPORT_DATA',
          message: 'No valid report data provided for export'
        }
      });
    }
    
    const data = reportData.data;
    
    switch (format) {
      case 'csv': {
        const csvData = convertToCSV(data);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
        return res.send(csvData);
      }
      
      case 'json':
      default: {
        // For JSON, just return the data as is
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=report.json');
        return res.json(reportData);
      }
    }
  } catch (error) {
    logger.error('Error exporting report:', error);
    return next(error);
  }
};

/**
 * Export inventory report data
 */
exports.exportInventoryReport = async (req, res, next) => {
  try {
    // This is a convenience endpoint that formats inventory data for export
    const { inventoryReportController } = require('./inventory-report.controller');
    
    // Get the report data first
    const reportData = await inventoryReportController.generateInventoryStatusReport(req, res, next);
    
    // Then pass to the generic export function
    return exports.exportReport(req, res, next);
  } catch (error) {
    return next(error);
  }
};

/**
 * Export sales report data
 */
exports.exportSalesReport = async (req, res, next) => {
  try {
    // This is a convenience endpoint that formats sales data for export
    const { salesReportController } = require('./sales-report.controller');
    
    // Get the report data first
    const reportData = await salesReportController.generateSalesSummaryReport(req, res, next);
    
    // Then pass to the generic export function
    return exports.exportReport(req, res, next);
  } catch (error) {
    return next(error);
  }
};