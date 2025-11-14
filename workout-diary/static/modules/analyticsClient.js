/**
 * Analytics Client Module
 * Handles API calls for the advanced analytics dashboard
 */

const AnalyticsClient = {
    getCsrfToken() {
        if (window.CSRF && typeof window.CSRF.getToken === 'function') {
            const token = window.CSRF.getToken();
            if (token) {
                window.__CSRF_TOKEN_CACHE = token;
                return token;
            }
        }

        if (window.__CSRF_TOKEN_CACHE) {
            return window.__CSRF_TOKEN_CACHE;
        }

        try {
            $.ajax({
                url: '/api/csrf-token',
                method: 'GET',
                async: false,
                success: function(response) {
                    if (response && response.csrfToken) {
                        window.__CSRF_TOKEN_CACHE = response.csrfToken;
                    }
                },
                error: function() {
                    console.warn('[AnalyticsClient] Unable to fetch CSRF token via fallback request');
                }
            });
        } catch (error) {
            console.warn('[AnalyticsClient] CSRF fallback error:', error);
        }

        return window.__CSRF_TOKEN_CACHE || null;
    },
    /**
     * Fetch KPI data for dashboard cards
     */
    async fetchKPIs(days = 30) {
        try {
            const response = await $.ajax({
                url: `/api/analytics/kpis?days=${days}`,
                method: 'GET',
                timeout: 10000
            });
            
            if (response.success) {
                return response.kpis;
            } else {
                throw new Error(response.error || 'Failed to fetch KPIs');
            }
        } catch (error) {
            console.error('Error fetching KPIs:', error);
            throw error;
        }
    },

    /**
     * Fetch volume by muscle groups
     */
    async fetchVolumeByMuscle(days = 30) {
        try {
            const response = await $.ajax({
                url: `/api/analytics/volume-by-muscle?days=${days}`,
                method: 'GET',
                timeout: 10000
            });
            
            if (response.success) {
                return {
                    data: response.data,
                    hasMuscleMapping: response.has_muscle_mapping
                };
            } else {
                throw new Error(response.error || 'Failed to fetch volume data');
            }
        } catch (error) {
            console.error('Error fetching volume by muscle:', error);
            throw error;
        }
    },

    /**
     * Fetch muscle balance scores
     */
    async fetchMuscleBalance(days = 30) {
        try {
            const response = await $.ajax({
                url: `/api/analytics/muscle-balance?days=${days}`,
                method: 'GET',
                timeout: 10000
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch muscle balance');
            }
        } catch (error) {
            console.error('Error fetching muscle balance:', error);
            throw error;
        }
    },

    /**
     * Fetch volume progression over weeks
     */
    async fetchVolumeProgression(weeks = 4) {
        try {
            const response = await $.ajax({
                url: `/api/analytics/volume-progression?weeks=${weeks}`,
                method: 'GET',
                timeout: 10000
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch volume progression');
            }
        } catch (error) {
            console.error('Error fetching volume progression:', error);
            throw error;
        }
    },

    /**
     * Fetch push/pull balance data
     */
    async fetchPushPullBalance(days = 30) {
        try {
            const csrfToken = this.getCsrfToken();

            const response = await $.ajax({
                url: `/api/analytics/push-pull-balance?days=${days}`,
                method: 'GET',
                timeout: 10000,
                headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined
            });
            
            if (response.success) {
                return {
                    data: response.data,
                    recommendation: response.recommendation,
                    pushVolume: response.push_volume,
                    pullVolume: response.pull_volume
                };
            } else {
                throw new Error(response.error || 'Failed to fetch push/pull balance');
            }
        } catch (error) {
            console.error('Error fetching push/pull balance:', error);
            throw error;
        }
    },

    /**
     * Fetch weak points analysis
     */
    async fetchWeakPoints(days = 30) {
        try {
            const response = await $.ajax({
                url: `/api/analytics/weak-points?days=${days}`,
                method: 'GET',
                timeout: 10000
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch weak points');
            }
        } catch (error) {
            console.error('Error fetching weak points:', error);
            throw error;
        }
    },

    /**
     * Fetch recent personal records
     */
    async fetchRecentPRs(days = 30, limit = 5) {
        try {
            const response = await $.ajax({
                url: `/api/analytics/recent-prs?days=${days}&limit=${limit}`,
                method: 'GET',
                timeout: 10000
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch recent PRs');
            }
        } catch (error) {
            console.error('Error fetching recent PRs:', error);
            throw error;
        }
    },

    /**
     * Fetch AI-powered recommendations
     */
    async fetchRecommendations(days = 30) {
        try {
            const csrfToken = this.getCsrfToken();

            const response = await $.ajax({
                url: `/api/analytics/recommendations?days=${days}`,
                method: 'GET',
                timeout: 10000,
                headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined
            });
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error || 'Failed to fetch recommendations');
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            throw error;
        }
    },

    /**
     * Fetch all analytics data at once
     */
    async fetchAllAnalytics(days = 30) {
        try {
            const [
                kpis,
                volumeByMuscle,
                muscleBalance,
                volumeProgression,
                pushPullBalance,
                weakPoints,
                recentPRs,
                recommendations
            ] = await Promise.all([
                this.fetchKPIs(days),
                this.fetchVolumeByMuscle(days),
                this.fetchMuscleBalance(days),
                this.fetchVolumeProgression(4),
                this.fetchPushPullBalance(days),
                this.fetchWeakPoints(days),
                this.fetchRecentPRs(days, 5),
                this.fetchRecommendations(days)
            ]);

            return {
                kpis,
                volumeByMuscle,
                muscleBalance,
                volumeProgression,
                pushPullBalance,
                weakPoints,
                recentPRs,
                recommendations
            };
        } catch (error) {
            console.error('Error fetching all analytics:', error);
            throw error;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsClient;
}




