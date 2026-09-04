// =============================================================================
// Shop Owner: Dashboard / Stats Screen
// =============================================================================
// Displays revenue statistics, revenue over time chart, and completed repairs
// list for the shop owner, adhering to `design.md` and `new-screen-design`.
//
// Key features:
//   - Header: "Total Revenue" with large prominent black numerals
//   - Horizontal toggle: "This Month" / "Last Month" / "All Time" with black underline
//   - Integrated with `get-revenue-stats` Supabase Edge Function
//   - Minimalist revenue over time bar chart (pure React Native)
//   - Completed repairs vertical list: device brand icon, device name,
//     amount charged, and completion date
//   - Pull-to-refresh & auto-refresh on screen focus
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Period = 'this_month' | 'last_month' | 'all_time';

interface RevenueStats {
  this_month: number;
  last_month: number;
  all_time: number;
  completed_count: number;
}

interface CompletedRepairItem {
  id: string;
  repair_request_id: string;
  completion_date: string;
  amount_charged: number;
  notes?: string | null;
  repair_request?: {
    brand?: string;
    device_name?: string;
    problem_type?: string;
  } | null;
}

interface MonthChartBar {
  label: string;
  amount: number;
  isCurrent: boolean;
}

export default function OwnerDashboardScreen() {
  const { signOut } = useAuth();

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('this_month');
  const [stats, setStats] = useState<RevenueStats>({
    this_month: 0,
    last_month: 0,
    all_time: 0,
    completed_count: 0,
  });
  const [completedRepairs, setCompletedRepairs] = useState<CompletedRepairItem[]>([]);
  const [chartBars, setChartBars] = useState<MonthChartBar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch revenue stats from Edge Function and completed repairs from database.
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Invoke get-revenue-stats Edge Function
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-revenue-stats');

      // 2. Fetch completed repairs list with joined repair request details
      const { data: repairsData, error: repairsError } = await supabase
        .from('completed_repairs')
        .select(`
          id,
          repair_request_id,
          completion_date,
          amount_charged,
          notes,
          repair_request:repair_request_id (
            brand,
            device_name,
            problem_type
          )
        `)
        .order('completion_date', { ascending: false });

      if (repairsError) {
        console.error('Error fetching completed repairs:', repairsError.message);
      }

      const repairList = (repairsData as unknown as CompletedRepairItem[]) || [];
      setCompletedRepairs(repairList);

      // If Edge Function returned stats successfully, use it; otherwise compute fallback
      if (!edgeError && edgeData?.data) {
        setStats(edgeData.data);
      } else {
        // Client-side fallback calculation
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth();
        const prevMonthDate = new Date(curYear, curMonth - 1, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth();

        let allTime = 0;
        let thisM = 0;
        let lastM = 0;

        for (const item of repairList) {
          const amt = Number(item.amount_charged) || 0;
          allTime += amt;
          const d = new Date(item.completion_date);
          if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
            thisM += amt;
          } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
            lastM += amt;
          }
        }

        setStats({
          this_month: thisM,
          last_month: lastM,
          all_time: allTime,
          completed_count: repairList.length,
        });
      }

      // 3. Compute 6-month historical chart bars from repairs
      buildHistoricalChart(repairList);
    } catch (err) {
      console.error('Unexpected error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Generates a 6-month historical bar chart series from completed repairs.
   */
  const buildHistoricalChart = (repairs: CompletedRepairItem[]) => {
    const now = new Date();
    const months: MonthChartBar[] = [];

    // Create 6 monthly buckets leading up to current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      let total = 0;
      for (const item of repairs) {
        const itemDate = new Date(item.completion_date);
        if (itemDate.getFullYear() === year && itemDate.getMonth() === month) {
          total += Number(item.amount_charged) || 0;
        }
      }

      months.push({
        label,
        amount: Math.round(total),
        isCurrent: i === 0,
      });
    }

    setChartBars(months);
  };

  // Re-fetch data on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (err) {
            console.error('Sign out error:', err);
          }
        },
      },
    ]);
  };

  /**
   * Get displayed revenue based on active period tab.
   */
  const getActiveRevenue = (): number => {
    if (selectedPeriod === 'this_month') return stats.this_month;
    if (selectedPeriod === 'last_month') return stats.last_month;
    return stats.all_time;
  };

  /**
   * Format currency values.
   */
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  /**
   * Format date for completed repair cards.
   */
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  /**
   * Brand icon helper.
   */
  const getBrandIcon = (brand?: string): any => {
    if (!brand) return 'phone-portrait-outline';
    const b = brand.toLowerCase();
    if (b.includes('apple')) return 'logo-apple';
    if (b.includes('samsung')) return 'phone-portrait-outline';
    if (b.includes('oneplus')) return 'hardware-chip-outline';
    if (b.includes('xiaomi')) return 'tablet-portrait-outline';
    return 'phone-portrait-outline';
  };

  // Find maximum value in chart bars for proportional scaling
  const maxChartAmount = Math.max(...chartBars.map((b) => b.amount), 100);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerWordmark}>Mob Dr</Text>
          <Text style={styles.headerSub}>Shop Owner Console</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleSignOut}
          accessibilityLabel="Sign out"
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {/* Loading Indicator */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={styles.loadingText}>Loading revenue stats...</Text>
          </View>
        ) : (
          <>
            {/* Top Revenue Display (Large bold text & prominent numerals per design.md) */}
            <View style={styles.revenueHeroCard}>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <Text style={styles.revenueAmount}>{formatCurrency(getActiveRevenue())}</Text>
              <Text style={styles.revenueSubtitle}>
                {selectedPeriod === 'this_month'
                  ? 'Earnings for current calendar month'
                  : selectedPeriod === 'last_month'
                  ? 'Earnings for previous calendar month'
                  : `All-time earnings across ${stats.completed_count} repairs`}
              </Text>
            </View>

            {/* Horizontal Toggle: "This Month" / "Last Month" / "All Time" (black underline) */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleTab,
                  selectedPeriod === 'this_month' && styles.toggleTabActive,
                ]}
                onPress={() => setSelectedPeriod('this_month')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleTabText,
                    selectedPeriod === 'this_month' && styles.toggleTabTextActive,
                  ]}
                >
                  This Month
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleTab,
                  selectedPeriod === 'last_month' && styles.toggleTabActive,
                ]}
                onPress={() => setSelectedPeriod('last_month')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleTabText,
                    selectedPeriod === 'last_month' && styles.toggleTabTextActive,
                  ]}
                >
                  Last Month
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleTab,
                  selectedPeriod === 'all_time' && styles.toggleTabActive,
                ]}
                onPress={() => setSelectedPeriod('all_time')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleTabText,
                    selectedPeriod === 'all_time' && styles.toggleTabTextActive,
                  ]}
                >
                  All Time
                </Text>
              </TouchableOpacity>
            </View>

            {/* Revenue Over Time Chart (Simple bar chart in black and gray per design.md) */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Revenue Over Time</Text>
                <Text style={styles.chartLegend}>Last 6 Months</Text>
              </View>

              <View style={styles.chartContainer}>
                {chartBars.map((bar, idx) => {
                  const heightPercent = Math.max(
                    (bar.amount / maxChartAmount) * 100,
                    bar.amount > 0 ? 8 : 4
                  );

                  return (
                    <View key={`bar_${idx}`} style={styles.chartColumn}>
                      {bar.amount > 0 && (
                        <Text style={styles.barAmountText}>
                          {bar.amount >= 1000 ? `$${(bar.amount / 1000).toFixed(1)}k` : `$${bar.amount}`}
                        </Text>
                      )}
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { height: `${heightPercent}%` },
                            bar.isCurrent ? styles.barFillCurrent : styles.barFillPast,
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.barLabel,
                          bar.isCurrent && styles.barLabelCurrent,
                        ]}
                      >
                        {bar.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Completed Repairs Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Completed Repairs</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{completedRepairs.length}</Text>
              </View>
            </View>

            {completedRepairs.length > 0 ? (
              completedRepairs.map((item) => {
                const req = item.repair_request;
                return (
                  <View key={item.id} style={styles.repairCard}>
                    {/* Device Brand Icon */}
                    <View style={styles.repairIconCircle}>
                      <Ionicons
                        name={getBrandIcon(req?.brand)}
                        size={22}
                        color="#000000"
                      />
                    </View>

                    {/* Device Name & Problem */}
                    <View style={styles.repairInfo}>
                      <Text style={styles.repairDeviceName} numberOfLines={1}>
                        {req?.device_name || 'Phone Repair'}
                      </Text>
                      <Text style={styles.repairProblemText} numberOfLines={1}>
                        {req?.problem_type || 'General Service'}
                      </Text>
                    </View>

                    {/* Amount Charged & Completion Date */}
                    <View style={styles.repairRightCol}>
                      <Text style={styles.repairAmountText}>
                        {formatCurrency(Number(item.amount_charged) || 0)}
                      </Text>
                      <Text style={styles.repairDateText}>
                        {formatDate(item.completion_date)}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyRepairsCard}>
                <Ionicons name="receipt-outline" size={36} color="#8A8A8A" />
                <Text style={styles.emptyRepairsTitle}>No Completed Repairs</Text>
                <Text style={styles.emptyRepairsSubtitle}>
                  Repairs marked as completed will show up here along with their revenue.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerWordmark: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '600',
    marginTop: 2,
  },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8A8A8A',
  },

  // Revenue Hero Card (Uber-style minimal)
  revenueHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  revenueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -1,
    marginBottom: 6,
  },
  revenueSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
  },

  // Toggle Row: "This Month" / "Last Month" / "All Time" (black underline)
  toggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 24,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  toggleTabActive: {
    borderBottomColor: '#000000',
  },
  toggleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  toggleTabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },

  // Chart Card
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  chartLegend: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 16,
    paddingBottom: 6,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barAmountText: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '700',
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    flex: 1,
    backgroundColor: '#F7F7F7',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barFillCurrent: {
    backgroundColor: '#000000',
  },
  barFillPast: {
    backgroundColor: '#CCCCCC',
  },
  barLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
    marginTop: 8,
  },
  barLabelCurrent: {
    color: '#000000',
    fontWeight: '800',
  },

  // Completed Repairs Section
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Past Repair Cards (Minimal with subtle dividers, no heavy borders)
  repairCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1.5,
  },
  repairIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  repairInfo: {
    flex: 1,
    marginRight: 10,
  },
  repairDeviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  repairProblemText: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  repairRightCol: {
    alignItems: 'flex-end',
  },
  repairAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 3,
  },
  repairDateText: {
    fontSize: 11,
    color: '#8A8A8A',
  },

  // Empty State
  emptyRepairsCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  emptyRepairsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyRepairsSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 18,
  },
});
