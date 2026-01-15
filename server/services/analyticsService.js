const ModerationLog = require('../models/ModerationLog');

/**
 * Get overview analytics
 */
const getOverview = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    // Total count
    const totalModerated = await ModerationLog.countDocuments();

    // Today's count
    const todayCount = await ModerationLog.countDocuments({
        createdAt: { $gte: startOfToday }
    });

    // Week count
    const weekCount = await ModerationLog.countDocuments({
        createdAt: { $gte: startOfWeek }
    });

    // Verdict breakdown
    const verdictBreakdown = await ModerationLog.aggregate([
        {
            $group: {
                _id: '$verdict',
                count: { $sum: 1 }
            }
        }
    ]);

    // Category breakdown
    const categoryBreakdown = await ModerationLog.aggregate([
        {
            $match: { category: { $ne: null } }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    // Average response time
    const avgResponseTimeResult = await ModerationLog.aggregate([
        {
            $group: {
                _id: null,
                avgResponseTime: { $avg: '$aiResponseTime' }
            }
        }
    ]);

    // Pending review count
    const pendingReviewCount = await ModerationLog.countDocuments({
        reviewStatus: 'pending'
    });

    // Average confidence
    const avgConfidenceResult = await ModerationLog.aggregate([
        {
            $group: {
                _id: null,
                avgConfidence: { $avg: '$confidence' }
            }
        }
    ]);

    return {
        totalModerated,
        todayCount,
        weekCount,
        verdictBreakdown: verdictBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, { safe: 0, flagged: 0, rejected: 0 }),
        categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {}),
        avgResponseTime: Math.round(avgResponseTimeResult[0]?.avgResponseTime || 0),
        avgConfidence: (avgConfidenceResult[0]?.avgConfidence || 0).toFixed(2),
        pendingReviewCount
    };
};

/**
 * Get time series data for charts
 */
const getTimeSeries = async (days = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timeSeries = await ModerationLog.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                count: { $sum: 1 },
                safe: {
                    $sum: { $cond: [{ $eq: ['$verdict', 'safe'] }, 1, 0] }
                },
                flagged: {
                    $sum: { $cond: [{ $eq: ['$verdict', 'flagged'] }, 1, 0] }
                },
                rejected: {
                    $sum: { $cond: [{ $eq: ['$verdict', 'rejected'] }, 1, 0] }
                }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    return timeSeries.map(item => ({
        date: item._id,
        count: item.count,
        safe: item.safe,
        flagged: item.flagged,
        rejected: item.rejected
    }));
};

/**
 * Get category distribution
 */
const getCategoryDistribution = async () => {
    const distribution = await ModerationLog.aggregate([
        {
            $match: { category: { $ne: null } }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidence' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);

    return distribution.map(item => ({
        category: item._id,
        count: item.count,
        avgConfidence: (item.avgConfidence * 100).toFixed(1)
    }));
};

module.exports = {
    getOverview,
    getTimeSeries,
    getCategoryDistribution
};
