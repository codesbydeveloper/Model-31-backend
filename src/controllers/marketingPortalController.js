const svc = require("../services/marketingPortalService");
const { success } = require("../utils/response");

async function dashboard(req, res, next) {
  try {
    const data = await svc.getDashboard(req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function acquisitionDashboard(req, res, next) {
  try {
    const data = await svc.getAcquisitionDashboard();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function listEngagement(req, res, next) {
  try {
    return success(res, await svc.listEngagement(req.query));
  } catch (err) {
    next(err);
  }
}

async function getEngagement(req, res, next) {
  try {
    return success(res, await svc.getEngagement(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listStoryInteractions(req, res, next) {
  try {
    return success(res, await svc.listStoryInteractions(req.query));
  } catch (err) {
    next(err);
  }
}

async function listReturningVisitors(req, res, next) {
  try {
    return success(res, await svc.listReturningVisitors(req.query));
  } catch (err) {
    next(err);
  }
}

async function listIntentSignals(req, res, next) {
  try {
    return success(res, await svc.listIntentSignals(req.query));
  } catch (err) {
    next(err);
  }
}

async function listIntentKeywords(req, res, next) {
  try {
    return success(res, await svc.listIntentKeywords(req.query));
  } catch (err) {
    next(err);
  }
}

async function listBudgetSignals(req, res, next) {
  try {
    return success(res, await svc.listBudgetSignals(req.query));
  } catch (err) {
    next(err);
  }
}

async function linkIntentLead(req, res, next) {
  try {
    const data = await svc.linkIntentLead(req.params.id, req.body);
    return success(res, { message: "Lead linked", ...data });
  } catch (err) {
    next(err);
  }
}

async function linkBudgetLead(req, res, next) {
  try {
    const data = await svc.linkBudgetLead(req.params.id, req.body);
    return success(res, { message: "Lead linked", ...data });
  } catch (err) {
    next(err);
  }
}

async function listReferrals(req, res, next) {
  try {
    return success(res, await svc.listReferrals(req.query));
  } catch (err) {
    next(err);
  }
}

async function listEligibleReferrers(req, res, next) {
  try {
    return success(res, await svc.listEligibleReferrers(req.query));
  } catch (err) {
    next(err);
  }
}

async function askReferral(req, res, next) {
  try {
    const data = await svc.askReferral(req.body);
    return success(res, { message: "Referral request sent", ...data }, 201);
  } catch (err) {
    next(err);
  }
}

async function listLifeEvents(req, res, next) {
  try {
    return success(res, await svc.listLifeEvents(req.query));
  } catch (err) {
    next(err);
  }
}

async function getLifeEvent(req, res, next) {
  try {
    return success(res, await svc.getLifeEvent(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function dismissLifeEvent(req, res, next) {
  try {
    return success(res, await svc.dismissLifeEvent(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createMockLeadFromLifeEvent(req, res, next) {
  try {
    const data = await svc.createMockLeadFromLifeEvent(req.params.id);
    return success(res, data, 201);
  } catch (err) {
    next(err);
  }
}

async function getLinkedLead(req, res, next) {
  try {
    return success(res, await svc.getLinkedLead(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listPersonas(req, res, next) {
  try {
    return success(res, await svc.listPersonas(req.query));
  } catch (err) {
    next(err);
  }
}

async function createPersona(req, res, next) {
  try {
    return success(res, await svc.createPersona(req.body), 201);
  } catch (err) {
    next(err);
  }
}

async function getPersona(req, res, next) {
  try {
    return success(res, await svc.getPersona(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listCommunities(req, res, next) {
  try {
    return success(res, await svc.listCommunities(req.query));
  } catch (err) {
    next(err);
  }
}

async function getCommunity(req, res, next) {
  try {
    return success(res, await svc.getCommunity(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listFollowUps(req, res, next) {
  try {
    return success(res, await svc.listFollowUps(req.query));
  } catch (err) {
    next(err);
  }
}

async function getFollowUp(req, res, next) {
  try {
    return success(res, await svc.getFollowUp(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createFollowUp(req, res, next) {
  try {
    return success(res, await svc.createFollowUp(req.body), 201);
  } catch (err) {
    next(err);
  }
}

async function pauseFollowUp(req, res, next) {
  try {
    return success(res, await svc.pauseFollowUp(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function resumeFollowUp(req, res, next) {
  try {
    return success(res, await svc.resumeFollowUp(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function contentFormOptions(req, res, next) {
  try {
    return success(res, await svc.getContentFormOptions());
  } catch (err) {
    next(err);
  }
}

async function listAiContents(req, res, next) {
  try {
    return success(res, await svc.listAiContents(req.query));
  } catch (err) {
    next(err);
  }
}

async function getAiContentDetail(req, res, next) {
  try {
    return success(res, await svc.getAiContentDetail(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function generateAiContent(req, res, next) {
  try {
    return success(res, await svc.generateAiContent(req.body, req.user), 201);
  } catch (err) {
    next(err);
  }
}

async function regenerateAiContent(req, res, next) {
  try {
    return success(res, await svc.regenerateAiContent(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function updateAiContent(req, res, next) {
  try {
    return success(res, await svc.updateAiContent(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function saveAiContentDraft(req, res, next) {
  try {
    return success(
      res,
      await svc.saveAiContentDraft(req.params.id, req.body, req.user)
    );
  } catch (err) {
    next(err);
  }
}

async function submitAiContent(req, res, next) {
  try {
    return success(res, await svc.submitAiContent(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
}

async function approveAiContent(req, res, next) {
  try {
    return success(res, await svc.approveAiContent(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
}

async function rejectAiContent(req, res, next) {
  try {
    return success(
      res,
      await svc.rejectAiContent(req.params.id, req.body, req.user)
    );
  } catch (err) {
    next(err);
  }
}

async function requestContentChanges(req, res, next) {
  try {
    return success(
      res,
      await svc.requestContentChanges(req.params.id, req.body, req.user)
    );
  } catch (err) {
    next(err);
  }
}

async function listApprovalQueue(req, res, next) {
  try {
    return success(res, await svc.listApprovalQueue(req.query));
  } catch (err) {
    next(err);
  }
}

async function getApprovalReview(req, res, next) {
  try {
    return success(res, await svc.getApprovalReview(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function duplicateAiContent(req, res, next) {
  try {
    return success(
      res,
      await svc.duplicateAiContent(req.params.id, req.user),
      201
    );
  } catch (err) {
    next(err);
  }
}

async function deleteAiContent(req, res, next) {
  try {
    return success(res, await svc.deleteAiContent(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listScheduledPosts(req, res, next) {
  try {
    return success(res, await svc.listScheduledPosts(req.query));
  } catch (err) {
    next(err);
  }
}

async function getScheduledPost(req, res, next) {
  try {
    return success(res, await svc.getScheduledPost(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function rescheduleScheduledPost(req, res, next) {
  try {
    return success(
      res,
      await svc.rescheduleScheduledPost(req.params.id, req.body)
    );
  } catch (err) {
    next(err);
  }
}

async function cancelScheduledPost(req, res, next) {
  try {
    return success(res, await svc.cancelScheduledPost(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listSocialAccounts(req, res, next) {
  try {
    return success(res, await svc.listSocialAccounts(req.query));
  } catch (err) {
    next(err);
  }
}

async function getSocialAccountSettings(req, res, next) {
  try {
    return success(res, await svc.getSocialAccountSettings(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function updateSocialAccountSettings(req, res, next) {
  try {
    return success(
      res,
      await svc.updateSocialAccountSettings(req.params.id, req.body)
    );
  } catch (err) {
    next(err);
  }
}

async function connectSocialAccount(req, res, next) {
  try {
    return success(
      res,
      await svc.connectSocialAccount(req.params.id, req.body)
    );
  } catch (err) {
    next(err);
  }
}

async function disconnectSocialAccount(req, res, next) {
  try {
    return success(res, await svc.disconnectSocialAccount(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function listCampaigns(req, res, next) {
  try {
    return success(res, await svc.listCampaigns(req.query));
  } catch (err) {
    next(err);
  }
}

async function createCampaign(req, res, next) {
  try {
    return success(res, await svc.createCampaign(req.body), 201);
  } catch (err) {
    next(err);
  }
}

async function getCampaignDetail(req, res, next) {
  try {
    return success(res, await svc.getCampaignDetail(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function getPerformance(req, res, next) {
  try {
    return success(res, await svc.getPerformance(req.query));
  } catch (err) {
    next(err);
  }
}

async function getPerformanceStats(req, res, next) {
  try {
    return success(res, await svc.getPerformanceStats(req.query));
  } catch (err) {
    next(err);
  }
}

async function getPerformanceCharts(req, res, next) {
  try {
    return success(res, await svc.getPerformanceCharts(req.query));
  } catch (err) {
    next(err);
  }
}

async function getPerformanceTopContent(req, res, next) {
  try {
    return success(res, await svc.getPerformanceTopContent(req.query));
  } catch (err) {
    next(err);
  }
}

async function getAttribution(req, res, next) {
  try {
    return success(res, await svc.getAttribution(req.query));
  } catch (err) {
    next(err);
  }
}

async function getAttributionStats(req, res, next) {
  try {
    return success(res, await svc.getAttributionStats());
  } catch (err) {
    next(err);
  }
}

async function getAttributionFunnel(req, res, next) {
  try {
    return success(res, await svc.getAttributionFunnel());
  } catch (err) {
    next(err);
  }
}

async function getAttributionJourney(req, res, next) {
  try {
    return success(res, await svc.getAttributionJourney());
  } catch (err) {
    next(err);
  }
}

async function getAttributionBreakdown(req, res, next) {
  try {
    return success(res, await svc.getAttributionBreakdown(req.query));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  acquisitionDashboard,
  listEngagement,
  getEngagement,
  listStoryInteractions,
  listReturningVisitors,
  listIntentSignals,
  listIntentKeywords,
  listBudgetSignals,
  linkIntentLead,
  linkBudgetLead,
  listReferrals,
  listEligibleReferrers,
  askReferral,
  listLifeEvents,
  getLifeEvent,
  dismissLifeEvent,
  createMockLeadFromLifeEvent,
  getLinkedLead,
  listPersonas,
  createPersona,
  getPersona,
  listCommunities,
  getCommunity,
  listFollowUps,
  getFollowUp,
  createFollowUp,
  pauseFollowUp,
  resumeFollowUp,
  contentFormOptions,
  listAiContents,
  getAiContentDetail,
  generateAiContent,
  regenerateAiContent,
  updateAiContent,
  saveAiContentDraft,
  submitAiContent,
  approveAiContent,
  rejectAiContent,
  requestContentChanges,
  listApprovalQueue,
  getApprovalReview,
  duplicateAiContent,
  deleteAiContent,
  listScheduledPosts,
  getScheduledPost,
  rescheduleScheduledPost,
  cancelScheduledPost,
  listSocialAccounts,
  getSocialAccountSettings,
  updateSocialAccountSettings,
  connectSocialAccount,
  disconnectSocialAccount,
  listCampaigns,
  createCampaign,
  getCampaignDetail,
  getPerformance,
  getPerformanceStats,
  getPerformanceCharts,
  getPerformanceTopContent,
  getAttribution,
  getAttributionStats,
  getAttributionFunnel,
  getAttributionJourney,
  getAttributionBreakdown,
};
