const express = require("express");
const ctrl = require("../controllers/marketingPortalController");
const {
  authMiddleware,
  requireMarketingManager,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireMarketingManager);

router.get("/dashboard", ctrl.dashboard);
router.get("/acquisition/dashboard", ctrl.acquisitionDashboard);

router.get("/engagement", ctrl.listEngagement);
router.get("/engagement/story-interactions", ctrl.listStoryInteractions);
router.get("/engagement/returning-visitors", ctrl.listReturningVisitors);
router.get("/engagement/:id", ctrl.getEngagement);

router.get("/intent-signals/keywords", ctrl.listIntentKeywords);
router.get("/intent-signals/budget", ctrl.listBudgetSignals);
router.patch("/intent-signals/budget/:id/link-lead", ctrl.linkBudgetLead);
router.get("/intent-signals", ctrl.listIntentSignals);
router.patch("/intent-signals/:id/link-lead", ctrl.linkIntentLead);

router.get("/referrals/eligible", ctrl.listEligibleReferrers);
router.post("/referrals/ask", ctrl.askReferral);
router.get("/referrals", ctrl.listReferrals);

router.get("/life-events", ctrl.listLifeEvents);
router.get("/life-events/:id/linked-lead", ctrl.getLinkedLead);
router.patch("/life-events/:id/dismiss", ctrl.dismissLifeEvent);
router.post("/life-events/:id/create-mock-lead", ctrl.createMockLeadFromLifeEvent);
router.get("/life-events/:id", ctrl.getLifeEvent);

router.get("/personas", ctrl.listPersonas);
router.post("/personas", ctrl.createPersona);
router.get("/personas/:id", ctrl.getPersona);

router.get("/communities", ctrl.listCommunities);
router.get("/communities/:id", ctrl.getCommunity);

router.get("/follow-ups", ctrl.listFollowUps);
router.post("/follow-ups", ctrl.createFollowUp);
router.patch("/follow-ups/:id/pause", ctrl.pauseFollowUp);
router.patch("/follow-ups/:id/resume", ctrl.resumeFollowUp);
router.get("/follow-ups/:id", ctrl.getFollowUp);

router.get("/content/options", ctrl.contentFormOptions);
router.get("/content", ctrl.listAiContents);
router.post("/content/generate", ctrl.generateAiContent);
router.post("/content/:id/regenerate", ctrl.regenerateAiContent);
router.post("/content/:id/save-draft", ctrl.saveAiContentDraft);
router.post("/content/:id/submit", ctrl.submitAiContent);
router.post("/content/:id/approve", ctrl.approveAiContent);
router.post("/content/:id/reject", ctrl.rejectAiContent);
router.post("/content/:id/request-changes", ctrl.requestContentChanges);
router.post("/content/:id/duplicate", ctrl.duplicateAiContent);
router.put("/content/:id", ctrl.updateAiContent);
router.delete("/content/:id", ctrl.deleteAiContent);
router.get("/content/:id", ctrl.getAiContentDetail);

router.get("/approval", ctrl.listApprovalQueue);
router.get("/approval/:id", ctrl.getApprovalReview);
router.post("/approval/:id/approve", ctrl.approveAiContent);
router.post("/approval/:id/reject", ctrl.rejectAiContent);
router.post("/approval/:id/request-changes", ctrl.requestContentChanges);
router.put("/approval/:id", ctrl.updateAiContent);

router.get("/scheduled-posts", ctrl.listScheduledPosts);
router.get("/scheduled-posts/:id", ctrl.getScheduledPost);
router.patch("/scheduled-posts/:id/reschedule", ctrl.rescheduleScheduledPost);
router.patch("/scheduled-posts/:id/cancel", ctrl.cancelScheduledPost);

router.get("/social-accounts", ctrl.listSocialAccounts);
router.get("/social-accounts/:id", ctrl.getSocialAccountSettings);
router.put("/social-accounts/:id/settings", ctrl.updateSocialAccountSettings);
router.post("/social-accounts/:id/connect", ctrl.connectSocialAccount);
router.post("/social-accounts/:id/disconnect", ctrl.disconnectSocialAccount);

router.get("/campaigns", ctrl.listCampaigns);
router.post("/campaigns", ctrl.createCampaign);
router.get("/campaigns/:id", ctrl.getCampaignDetail);

router.get("/performance/stats", ctrl.getPerformanceStats);
router.get("/performance/charts", ctrl.getPerformanceCharts);
router.get("/performance/top-content", ctrl.getPerformanceTopContent);
router.get("/performance", ctrl.getPerformance);

router.get("/attribution/stats", ctrl.getAttributionStats);
router.get("/attribution/funnel", ctrl.getAttributionFunnel);
router.get("/attribution/journey", ctrl.getAttributionJourney);
router.get("/attribution/breakdown", ctrl.getAttributionBreakdown);
router.get("/attribution", ctrl.getAttribution);

module.exports = router;
