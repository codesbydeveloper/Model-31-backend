function getOverview() {
  return {
    pageTitle: "Platform Analytics",
    summary: {
      totalLeads: 0,
      qualifiedLeads: 0,
      routedLeads: 0,
      appointments: 0,
      soldDeals: 0,
      revenue: 0,
      revenueFormatted: "$0",
      conversionRate: 0,
      conversionRateFormatted: "0.00%",
      averageLeadScore: 0,
      averageResponseTime: "—",
    },
    leadFunnel: [],
    leadSources: [],
    dealershipPerformance: [],
    aiPerformance: {
      aiConversations: 0,
      qualificationRate: 0,
      qualificationRateFormatted: "0.00%",
      aiResponseTime: "—",
      aiAssistedLeads: 0,
      aiAppointments: 0,
      aiConversion: 0,
      aiConversionFormatted: "0.00%",
    },
    salesPerformance: {
      summary: {
        activeSalespeople: 0,
        averageResponseTime: "—",
        leadAcceptanceRate: 0,
        leadAcceptanceRateFormatted: "0.00%",
        appointmentRate: 0,
        appointmentRateFormatted: "0.00%",
        soldRate: 0,
        soldRateFormatted: "0.00%",
      },
      salespeople: [],
    },
    marketingPerformance: {
      summary: {
        reach: 0,
        engagement: 0,
        engagementFormatted: "0.00%",
        leads: 0,
        appointments: 0,
        sold: 0,
        revenue: 0,
        revenueFormatted: "$0",
      },
      byPlatform: [],
      byCampaign: [],
      byDealership: [],
    },
    attributionJourney: [],
  };
}

module.exports = { getOverview };
