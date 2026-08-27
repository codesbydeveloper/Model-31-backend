const bcrypt = require("bcrypt");
const User = require("../models/User");
const Dealership = require("../models/Dealership");
const ScoringRules = require("../models/ScoringRules");
const DealershipSettings = require("../models/DealershipSettings");
const DealershipCrm = require("../models/DealershipCrm");

const DEMO_PASSWORD = "Demo@123";

async function seedDemoData() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const existingAdmin = await User.findByEmail("superadmin@model31.com");
  if (!existingAdmin) {
    await User.create({
      id: "usr_superadmin",
      name: "Alex Rivera",
      email: "superadmin@model31.com",
      password: passwordHash,
      role: "Super Admin",
      dealershipId: null,
      salespersonId: null,
      status: "Active",
    });
  }

  let miami = await Dealership.findByName("Miami Luxury Motors");
  if (!miami) {
    miami = await Dealership.create({
      id: "dlr_miami",
      name: "Miami Luxury Motors",
      address: "1200 Biscayne Blvd",
      city: "Miami",
      state: "FL",
      zipCode: "33132",
      phone: "(305) 555-0100",
      website: "https://miamiluxurymotors.example",
      brands: "BMW, Mercedes-Benz, Audi",
      timezone: "America/New_York",
      status: "Active",
      crmStatus: "Connected",
      socialStatus: "Connected",
      activeLeads: 0,
    });
  }

  const existingManager = await User.findByEmail("manager@model31.com");
  if (!existingManager) {
    await User.create({
      id: "usr_dealer_manager",
      name: "Dealer Manager",
      email: "manager@model31.com",
      password: passwordHash,
      role: "Dealership Manager",
      dealershipId: miami.id,
      salespersonId: null,
      status: "Active",
    });
  }

  const existingBdc = await User.findByEmail("bdcmanager@model31.com");
  if (!existingBdc) {
    await User.create({
      id: "usr_bdc_manager",
      name: "BDC Manager",
      email: "bdcmanager@model31.com",
      password: passwordHash,
      role: "BDC Manager",
      dealershipId: null,
      salespersonId: null,
      status: "Active",
    });
  }

    const existingSales = await User.findByEmail("salesperson@model31.com");
  if (!existingSales) {
    await User.create({
      id: "usr_salesperson",
      name: "John Smith",
      email: "salesperson@model31.com",
      password: passwordHash,
      role: "Salesperson",
      dealershipId: miami.id,
      salespersonId: "sp_001",
      status: "Active",
    });
  }

  const existingMarketing = await User.findByEmail("marketing@model31.com");
  if (!existingMarketing) {
    await User.create({
      id: "usr_marketing_manager",
      name: "MM Marketing Manager",
      email: "marketing@model31.com",
      password: passwordHash,
      role: "Marketing Manager",
      dealershipId: null,
      salespersonId: null,
      status: "Active",
    });
  }

  const MarketingEngagement = require("../models/MarketingEngagement");
  const existingEng = await MarketingEngagement.findById("eng_001");
  if (!existingEng) {
    await MarketingEngagement.create({
      id: "eng_001",
      customerName: "Sarah Johnson",
      persona: "Luxury Lifestyle",
      dealershipId: miami.id,
      platform: "Instagram",
      likes: 1,
      comments: 0,
      dms: 1,
      stories: 0,
      returns: 1,
      level: "LOW",
      lastActivity: new Date("2026-08-10T09:12:00"),
      firstInteraction: new Date("2026-08-01T10:00:00"),
      totalInteractions: 2,
      shares: 0,
      saves: 0,
      leadLabel: "LEAD-2048",
      dmOpens: 2,
      dmReplies: 1,
      repeatOpens: 0,
      conversationReturns: 0,
      responseTime: "1m",
      signalEngagement: "VERY HIGH",
      signalIntent: "HIGH",
      budget: "$600/month",
      lifeEvent: "Moving",
      referralStatus: "Requested",
      community: "Miami Auto Community",
      followUp: "Day 2 of 7",
      potentialLead: true,
      status: "ACTIVE",
    });
    await MarketingEngagement.addActivity(
      "eng_001",
      "Liked Post",
      "Lexus RX launch reel",
      new Date("2026-08-10T09:12:00")
    );
    await MarketingEngagement.addActivity(
      "eng_001",
      "Commented",
      "Looking at lease options",
      new Date("2026-08-11T14:40:00")
    );
    await MarketingEngagement.addActivity(
      "eng_001",
      "Saved Post",
      "SUV inventory carousel",
      new Date("2026-08-12T11:05:00")
    );
  }

  const MarketingReferral = require("../models/MarketingReferral");
  const eligibleList = await MarketingReferral.listEligible({ page: 1, limit: 1 });
  if (eligibleList.pagination.total === 0) {
    const names = [
      "Sarah Johnson",
      "Robert Hayes",
      "Chloe Bennett",
      "Brian Foster",
      "Priya Patel",
    ];
    for (const name of names) {
      await MarketingReferral.createEligible({
        customerName: name,
        dealershipId: miami.id,
        status: "Eligible",
      });
    }
  }

  const MarketingLifeEvent = require("../models/MarketingLifeEvent");
  const lifeList = await MarketingLifeEvent.list({ page: 1, limit: 1 });
  if (lifeList.pagination.total === 0) {
    const samples = [
      {
        id: "life_001",
        customerName: "Sarah Johnson",
        lifeEvent: "New Baby",
        detectedFrom: "Customer Conversation",
        date: "2026-08-04",
        vehicleNeed: "Needs reliable SUV",
        intent: "HIGH",
        status: "NEW",
        customerSignal:
          "Mentioned relocating next month and needing more cargo space.",
        leadLabel: "LEAD-2060",
      },
      {
        id: "life_002",
        customerName: "Robert Hayes",
        lifeEvent: "New Job",
        detectedFrom: "DM Signal",
        date: "2026-08-05",
        vehicleNeed: "Wants efficient commute vehicle",
        intent: "MEDIUM",
        status: "REVIEWING",
        customerSignal: "Asked about hybrid options for a longer daily drive.",
      },
      {
        id: "life_003",
        customerName: "Chloe Bennett",
        lifeEvent: "Moving",
        detectedFrom: "Platform Form",
        date: "2026-08-06",
        vehicleNeed: "Looking for family crossover",
        intent: "HIGH",
        status: "LEAD CREATED",
        customerSignal: "Submitted form after relocating to a new suburb.",
        leadLabel: "LEAD-2061",
      },
      {
        id: "life_004",
        customerName: "Brian Foster",
        lifeEvent: "Vehicle Breakdown",
        detectedFrom: "Follow-Up Reply",
        date: "2026-08-07",
        vehicleNeed: "Needs replacement vehicle soon",
        intent: "MEDIUM",
        status: "NEW",
        customerSignal: "Current vehicle failed inspection; needs something soon.",
      },
      {
        id: "life_005",
        customerName: "Priya Patel",
        lifeEvent: "Growing Family",
        detectedFrom: "Customer Conversation",
        date: "2026-08-08",
        vehicleNeed: "Interested in EV options",
        intent: "LOW",
        status: "REVIEWING",
        customerSignal: "Exploring EVs with third-row seating for family trips.",
        leadLabel: "LEAD-2062",
      },
      {
        id: "life_006",
        customerName: "Marcus Lee",
        lifeEvent: "Longer Commute",
        detectedFrom: "DM Signal",
        date: "2026-08-09",
        vehicleNeed: "Needs reliable SUV",
        intent: "HIGH",
        status: "LEAD CREATED",
        customerSignal: "New office is 45 minutes away; wants highway comfort.",
        leadLabel: "LEAD-2063",
      },
      {
        id: "life_007",
        customerName: "Elena Vargas",
        lifeEvent: "New Driver",
        detectedFrom: "Platform Form",
        date: "2026-08-10",
        vehicleNeed: "Wants efficient commute vehicle",
        intent: "MEDIUM",
        status: "NEW",
        customerSignal: "Teen driver in household; looking for safe compact.",
      },
      {
        id: "life_008",
        customerName: "Aisha Khan",
        lifeEvent: "Retirement",
        detectedFrom: "Follow-Up Reply",
        date: "2026-08-11",
        vehicleNeed: "Looking for family crossover",
        intent: "HIGH",
        status: "REVIEWING",
        customerSignal: "Wants easier entry height and lower maintenance costs.",
      },
      {
        id: "life_009",
        customerName: "Daniel Ortiz",
        lifeEvent: "New Job",
        detectedFrom: "DM Signal",
        date: "2026-08-12",
        vehicleNeed: "Interested in EV options",
        intent: "MEDIUM",
        status: "NEW",
        customerSignal: "Employer offers EV charging; considering a switch.",
      },
      {
        id: "life_010",
        customerName: "Grace Nguyen",
        lifeEvent: "Moving",
        detectedFrom: "Customer Conversation",
        date: "2026-08-13",
        vehicleNeed: "Looking for family crossover",
        intent: "HIGH",
        status: "REVIEWING",
        customerSignal: "Moving closer to family and needs more passenger space.",
      },
      {
        id: "life_011",
        customerName: "Tom Bradley",
        lifeEvent: "Vehicle Breakdown",
        detectedFrom: "Follow-Up Reply",
        date: "2026-08-14",
        vehicleNeed: "Needs replacement vehicle soon",
        intent: "HIGH",
        status: "NEW",
        customerSignal: "Towing costs rising; ready to buy this week.",
      },
      {
        id: "life_012",
        customerName: "Nina Brooks",
        lifeEvent: "Growing Family",
        detectedFrom: "Platform Form",
        date: "2026-08-15",
        vehicleNeed: "Needs reliable SUV",
        intent: "MEDIUM",
        status: "LEAD CREATED",
        customerSignal: "Expecting twins; prioritizing safety and space.",
        leadLabel: "LEAD-2064",
      },
      {
        id: "life_013",
        customerName: "Omar Hassan",
        lifeEvent: "Longer Commute",
        detectedFrom: "DM Signal",
        date: "2026-08-16",
        vehicleNeed: "Wants efficient commute vehicle",
        intent: "LOW",
        status: "NEW",
        customerSignal: "Comparing MPG numbers for daily highway driving.",
      },
      {
        id: "life_014",
        customerName: "Lily Chen",
        lifeEvent: "New Driver",
        detectedFrom: "Customer Conversation",
        date: "2026-08-17",
        vehicleNeed: "Interested in EV options",
        intent: "MEDIUM",
        status: "REVIEWING",
        customerSignal: "First car for college; prefers low operating cost.",
      },
      {
        id: "life_015",
        customerName: "James Carter",
        lifeEvent: "Retirement",
        detectedFrom: "Platform Form",
        date: "2026-08-18",
        vehicleNeed: "Looking for family crossover",
        intent: "HIGH",
        status: "NEW",
        customerSignal: "Planning road trips with grandkids next year.",
      },
    ];

    for (const row of samples) {
      await MarketingLifeEvent.create({
        ...row,
        dealershipId: miami.id,
      });
    }
  }

  const MarketingPersona = require("../models/MarketingPersona");
  const personaList = await MarketingPersona.list({ page: 1, limit: 1 });
  if (personaList.pagination.total === 0) {
    const personas = [
      {
        id: "mp_luxury",
        name: "Luxury Lifestyle",
        description:
          "Premium buyers seeking refined SUVs and concierge-style service.",
        targetAudience: "Affluent professionals 35-55",
        tone: "Luxury",
        language: "English",
        primaryPlatform: "Instagram",
        platforms: ["Instagram", "YouTube", "Facebook"],
        status: "ACTIVE",
        followers: 18420,
        engagement: 92,
        leads: 86,
        appointments: 28,
        sold: 11,
        dmInteractions: 1240,
        storyInteractions: 860,
        returningVisitors: 412,
        intentSignals: 96,
      },
      {
        id: "mp_family",
        name: "Family Focus",
        description:
          "Parents prioritizing safety, space, and practical monthly payments.",
        targetAudience: "Families with kids 28-45",
        tone: "Friendly",
        language: "English",
        primaryPlatform: "Facebook",
        platforms: ["Facebook", "Instagram"],
        status: "ACTIVE",
        followers: 14200,
        engagement: 84,
        leads: 72,
        appointments: 24,
        sold: 9,
        dmInteractions: 980,
        storyInteractions: 640,
        returningVisitors: 310,
        intentSignals: 78,
      },
      {
        id: "mp_first",
        name: "First-Time Buyer",
        description:
          "New buyers exploring financing options and starter warranties.",
        targetAudience: "First-time buyers 22-34",
        tone: "Educational",
        language: "English",
        primaryPlatform: "TikTok",
        platforms: ["TikTok", "Instagram"],
        status: "ACTIVE",
        followers: 22100,
        engagement: 78,
        leads: 61,
        appointments: 18,
        sold: 6,
        dmInteractions: 1520,
        storyInteractions: 1100,
        returningVisitors: 280,
        intentSignals: 64,
      },
      {
        id: "mp_ev",
        name: "EV Enthusiast",
        description:
          "Shoppers researching electric range, charging, and incentives.",
        targetAudience: "Tech-forward drivers 30-50",
        tone: "Educational",
        language: "English",
        primaryPlatform: "YouTube",
        platforms: ["YouTube", "Instagram"],
        status: "ACTIVE",
        followers: 16800,
        engagement: 88,
        leads: 69,
        appointments: 21,
        sold: 8,
        dmInteractions: 870,
        storyInteractions: 520,
        returningVisitors: 355,
        intentSignals: 88,
      },
      {
        id: "mp_perf",
        name: "Performance Buyer",
        description:
          "Drivers focused on power, handling, and track-ready packages.",
        targetAudience: "Performance enthusiasts 25-45",
        tone: "Energetic",
        language: "English",
        primaryPlatform: "Instagram",
        platforms: ["Instagram", "YouTube"],
        status: "ACTIVE",
        followers: 19500,
        engagement: 90,
        leads: 58,
        appointments: 16,
        sold: 7,
        dmInteractions: 1100,
        storyInteractions: 790,
        returningVisitors: 290,
        intentSignals: 71,
      },
      {
        id: "mp_budget",
        name: "Budget Smart",
        description:
          "Value-focused shoppers comparing payments, incentives, and reliability.",
        targetAudience: "Budget-conscious buyers 25-40",
        tone: "Casual",
        language: "English",
        primaryPlatform: "Facebook",
        platforms: ["Facebook", "TikTok"],
        status: "ACTIVE",
        followers: 13200,
        engagement: 74,
        leads: 80,
        appointments: 22,
        sold: 10,
        dmInteractions: 760,
        storyInteractions: 430,
        returningVisitors: 340,
        intentSignals: 82,
      },
      {
        id: "mp_lease",
        name: "Lease Shopper",
        description:
          "Shoppers comparing lease terms, mileage limits, and monthly payments.",
        targetAudience: "Lease-oriented drivers 28-48",
        tone: "Professional",
        language: "English",
        primaryPlatform: "Instagram",
        platforms: ["Instagram", "Facebook"],
        status: "ACTIVE",
        followers: 12100,
        engagement: 81,
        leads: 66,
        appointments: 19,
        sold: 5,
        dmInteractions: 690,
        storyInteractions: 510,
        returningVisitors: 265,
        intentSignals: 70,
      },
      {
        id: "mp_adventure",
        name: "Adventure Driver",
        description:
          "Outdoor-focused drivers shopping capable SUVs and trucks.",
        targetAudience: "Outdoor enthusiasts 30-50",
        tone: "Energetic",
        language: "English",
        primaryPlatform: "YouTube",
        platforms: ["YouTube", "Instagram", "Facebook"],
        status: "ACTIVE",
        followers: 15700,
        engagement: 86,
        leads: 54,
        appointments: 15,
        sold: 6,
        dmInteractions: 820,
        storyInteractions: 600,
        returningVisitors: 298,
        intentSignals: 67,
      },
    ];

    for (const row of personas) {
      await MarketingPersona.create(row);
    }
  }

  const MarketingCommunity = require("../models/MarketingCommunity");
  const communityList = await MarketingCommunity.list({ page: 1, limit: 1 });
  if (communityList.pagination.total === 0) {
    const communities = [
      {
        id: "com_01",
        name: "Miami Auto Community",
        platform: "Facebook",
        location: "Miami, FL",
        audience: 18420,
        engagement: 86,
        leads: 42,
        qualified: 18,
        appointments: 9,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-14T09:10:00"),
      },
      {
        id: "com_02",
        name: "South Florida EV Owners",
        platform: "Facebook",
        location: "South Florida",
        audience: 12680,
        engagement: 79,
        leads: 31,
        qualified: 12,
        appointments: 6,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-13T16:20:00"),
      },
      {
        id: "com_03",
        name: "Brickell Luxury Drivers",
        platform: "Instagram",
        location: "Brickell",
        audience: 9800,
        engagement: 91,
        leads: 28,
        qualified: 14,
        appointments: 8,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-14T11:05:00"),
      },
      {
        id: "com_04",
        name: "Kendall Family Drivers",
        platform: "Facebook",
        location: "Kendall, FL",
        audience: 15200,
        engagement: 74,
        leads: 36,
        qualified: 15,
        appointments: 7,
        status: "MONITORED",
        lastActivity: new Date("2026-08-12T14:30:00"),
      },
      {
        id: "com_05",
        name: "Doral First-Time Buyers",
        platform: "TikTok",
        location: "Doral, FL",
        audience: 22100,
        engagement: 88,
        leads: 47,
        qualified: 16,
        appointments: 10,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-14T08:45:00"),
      },
      {
        id: "com_06",
        name: "Coral Gables Lease Club",
        platform: "Instagram",
        location: "Coral Gables",
        audience: 8700,
        engagement: 82,
        leads: 22,
        qualified: 9,
        appointments: 4,
        status: "MONITORED",
        lastActivity: new Date("2026-08-11T17:10:00"),
      },
      {
        id: "com_07",
        name: "Homestead Truck Owners",
        platform: "Facebook",
        location: "Homestead, FL",
        audience: 11450,
        engagement: 77,
        leads: 29,
        qualified: 11,
        appointments: 5,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-13T12:00:00"),
      },
      {
        id: "com_08",
        name: "Aventura Performance Club",
        platform: "Instagram",
        location: "Aventura, FL",
        audience: 13900,
        engagement: 90,
        leads: 33,
        qualified: 13,
        appointments: 7,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-14T15:20:00"),
      },
      {
        id: "com_09",
        name: "Fort Lauderdale SUV Network",
        platform: "Facebook",
        location: "Fort Lauderdale",
        audience: 16750,
        engagement: 81,
        leads: 39,
        qualified: 17,
        appointments: 8,
        status: "MONITORED",
        lastActivity: new Date("2026-08-10T10:15:00"),
      },
      {
        id: "com_10",
        name: "Wynwood Car Culture",
        platform: "TikTok",
        location: "Wynwood, FL",
        audience: 19800,
        engagement: 93,
        leads: 44,
        qualified: 19,
        appointments: 11,
        status: "ACTIVE",
        lastActivity: new Date("2026-08-14T18:40:00"),
      },
    ];

    for (const row of communities) {
      await MarketingCommunity.create({
        ...row,
        dealershipId: miami.id,
      });
    }

    await MarketingCommunity.addActivity(
      "com_01",
      "Customer Question",
      "Asked about lease specials",
      new Date("2026-08-14T09:10:00")
    );
    await MarketingCommunity.addActivity(
      "com_01",
      "Manual Response",
      "Dealership replied with inventory link",
      new Date("2026-08-14T10:06:00")
    );
    await MarketingCommunity.addActivity(
      "com_01",
      "Lead Created",
      "LEAD-2112 from community mention",
      new Date("2026-08-13T16:40:00")
    );
  }

  const FollowUpSequence = require("../models/FollowUpSequence");
  const followUpList = await FollowUpSequence.list({ page: 1, limit: 1 });
  if (followUpList.pagination.total === 0) {
    const defaultSteps = [
      {
        day: 0,
        channel: "Platform Message",
        message: "Initial Message",
        status: "ACTIVE",
        order: 1,
      },
      {
        day: 2,
        channel: "SMS",
        message: "Still looking?",
        status: "ACTIVE",
        order: 2,
      },
      {
        day: 5,
        channel: "Email",
        message: "Want us to send some options?",
        status: "ACTIVE",
        order: 3,
      },
      {
        day: 7,
        channel: "Manual Follow-Up",
        message: "Found something that may work for you.",
        status: "ACTIVE",
        order: 4,
      },
    ];

    const sequences = [
      {
        id: "fu_01",
        name: "High Intent Nurture",
        description: "7-day nurture for high-intent engagement signals.",
        targetAudience: "High Intent Customers",
        trigger: "High Intent",
        status: "ACTIVE",
        activeLeads: 42,
        completed: 18,
        conversion: 24.6,
      },
      {
        id: "fu_02",
        name: "Budget Signal Follow-Up",
        description: "Follow-up when budget signals appear.",
        targetAudience: "Budget Signal Prospects",
        trigger: "Budget Signal",
        status: "ACTIVE",
        activeLeads: 28,
        completed: 11,
        conversion: 19.4,
      },
      {
        id: "fu_03",
        name: "New Lead Welcome",
        description: "Welcome sequence for newly created leads.",
        targetAudience: "New Leads",
        trigger: "New Lead",
        status: "ACTIVE",
        activeLeads: 55,
        completed: 22,
        conversion: 21.8,
      },
      {
        id: "fu_04",
        name: "No Response Recovery",
        description: "Re-engage silent prospects after no reply.",
        targetAudience: "Silent Prospects",
        trigger: "No Response",
        status: "PAUSED",
        activeLeads: 16,
        completed: 7,
        conversion: 14.2,
      },
      {
        id: "fu_05",
        name: "Appointment Reminder Flow",
        description: "Remind customers before scheduled appointments.",
        targetAudience: "Booked Appointments",
        trigger: "Appointment Reminder",
        status: "ACTIVE",
        activeLeads: 33,
        completed: 20,
        conversion: 31.5,
      },
      {
        id: "fu_06",
        name: "Returning Visitor Sequence",
        description: "Nurture visitors who come back to content.",
        targetAudience: "Returning Visitors",
        trigger: "Returning Visitor",
        status: "ACTIVE",
        activeLeads: 24,
        completed: 9,
        conversion: 17.1,
      },
      {
        id: "fu_07",
        name: "Lease Shopper Sequence",
        description: "Lease-focused nurture for payment shoppers.",
        targetAudience: "Lease Shoppers",
        trigger: "High Intent",
        status: "DRAFT",
        activeLeads: 0,
        completed: 0,
        conversion: 0,
      },
      {
        id: "fu_08",
        name: "EV Interest Follow-Up",
        description: "Follow-up for EV research engagement.",
        targetAudience: "EV Enthusiasts",
        trigger: "Budget Signal",
        status: "PAUSED",
        activeLeads: 12,
        completed: 4,
        conversion: 12.8,
      },
      {
        id: "fu_09",
        name: "Family Focus Nurture",
        description: "Safety and space messaging for family buyers.",
        targetAudience: "Family Focus",
        trigger: "New Lead",
        status: "ACTIVE",
        activeLeads: 19,
        completed: 8,
        conversion: 18.6,
      },
      {
        id: "fu_10",
        name: "Post No-Show Recovery",
        description: "Recover customers after missed appointments.",
        targetAudience: "Missed Appointments",
        trigger: "No Response",
        status: "DRAFT",
        activeLeads: 0,
        completed: 0,
        conversion: 0,
      },
    ];

    for (const row of sequences) {
      await FollowUpSequence.create(row);
      for (const step of defaultSteps) {
        await FollowUpSequence.addStep(row.id, step);
      }
    }

    await FollowUpSequence.addActivity(
      "fu_01",
      "Started",
      "Sequence activated for 42 customers",
      new Date("2026-08-10T09:00:00")
    );
    await FollowUpSequence.addActivity(
      "fu_01",
      "Step 1",
      "Initial messages sent",
      new Date("2026-08-10T10:15:00")
    );
    await FollowUpSequence.addActivity(
      "fu_01",
      "Step 2",
      "Day 2 check-ins in progress",
      new Date("2026-08-12T11:30:00")
    );
  }

  const pool = require("../config/database");
  const MarketingCampaign = require("../models/MarketingCampaign");

  const chicago =
    (await Dealership.findByName("Chicago Auto Group")) ||
    (await Dealership.create({
      id: "dlr_chicago",
      name: "Chicago Auto Group",
      city: "Chicago",
      state: "IL",
      timezone: "America/Chicago",
      status: "Active",
      crmStatus: "Connected",
      socialStatus: "Connected",
    }));
  const dallas =
    (await Dealership.findByName("Dallas Premium Motors")) ||
    (await Dealership.create({
      id: "dlr_dallas",
      name: "Dallas Premium Motors",
      city: "Dallas",
      state: "TX",
      timezone: "America/Chicago",
      status: "Active",
      crmStatus: "Connected",
      socialStatus: "Connected",
    }));
  const la =
    (await Dealership.findByName("Los Angeles Auto Center")) ||
    (await Dealership.create({
      id: "dlr_la",
      name: "Los Angeles Auto Center",
      city: "Los Angeles",
      state: "CA",
      timezone: "America/Los_Angeles",
      status: "Active",
      crmStatus: "Connected",
      socialStatus: "Connected",
    }));
  const houston =
    (await Dealership.findByName("Houston Automotive Group")) ||
    (await Dealership.create({
      id: "dlr_houston",
      name: "Houston Automotive Group",
      city: "Houston",
      state: "TX",
      timezone: "America/Chicago",
      status: "Active",
      crmStatus: "Connected",
      socialStatus: "Connected",
    }));
  const atlanta =
    (await Dealership.findByName("Atlanta Drive Center")) ||
    (await Dealership.create({
      id: "dlr_atlanta",
      name: "Atlanta Drive Center",
      city: "Atlanta",
      state: "GA",
      timezone: "America/New_York",
      status: "Active",
      crmStatus: "Connected",
      socialStatus: "Connected",
    }));

  const campaignDefs = [
    {
      id: "camp_01",
      name: "Summer SUV Campaign",
      dealershipId: miami.id,
      objective: "Vehicle Promotion",
      platforms: ["Instagram", "Facebook", "TikTok"],
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      budget: 45000,
      targetAudience: "Luxury Buyer",
      description: "Promote luxury SUV inventory across social channels.",
      status: "ACTIVE",
      reach: 92000,
      engagement: 7.1,
      leads: 128,
      appointments: 34,
      soldDeals: 9,
    },
    {
      id: "camp_02",
      name: "Weekend Test Drive",
      dealershipId: chicago.id,
      objective: "Lead Generation",
      platforms: ["Facebook", "Instagram"],
      startDate: "2026-07-01",
      endDate: "2026-09-15",
      budget: 18000,
      targetAudience: "Family Buyer",
      description: "Drive weekend test-drive appointments.",
      status: "ACTIVE",
      reach: 41000,
      engagement: 5.4,
      leads: 64,
      appointments: 22,
      soldDeals: 5,
    },
    {
      id: "camp_03",
      name: "EV Awareness Push",
      dealershipId: miami.id,
      objective: "Brand Awareness",
      platforms: ["YouTube", "Instagram", "TikTok"],
      startDate: "2026-05-15",
      endDate: "2026-08-15",
      budget: 32000,
      targetAudience: "EV Buyer",
      description: "Educate shoppers on EV range and incentives.",
      status: "ACTIVE",
      reach: 78000,
      engagement: 6.2,
      leads: 91,
      appointments: 19,
      soldDeals: 4,
    },
    {
      id: "camp_04",
      name: "Family Adventure",
      dealershipId: dallas.id,
      objective: "Lead Generation",
      platforms: ["Facebook", "Instagram"],
      startDate: "2026-06-10",
      endDate: "2026-09-01",
      budget: 22000,
      targetAudience: "Family Buyer",
      description: "Family-focused SUV storytelling.",
      status: "PAUSED",
      reach: 28000,
      engagement: 4.8,
      leads: 41,
      appointments: 11,
      soldDeals: 2,
    },
    {
      id: "camp_05",
      name: "Open House August",
      dealershipId: la.id,
      objective: "Event Promotion",
      platforms: ["Facebook", "Instagram", "X"],
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      budget: 15000,
      targetAudience: "First-Time Buyer",
      description: "Promote August open house weekend.",
      status: "ACTIVE",
      reach: 35000,
      engagement: 5.1,
      leads: 57,
      appointments: 28,
      soldDeals: 6,
    },
    {
      id: "camp_06",
      name: "Trust Builders",
      dealershipId: houston.id,
      objective: "Brand Awareness",
      platforms: ["YouTube", "Facebook"],
      startDate: "2026-04-01",
      endDate: "2026-07-31",
      budget: 12000,
      targetAudience: "Budget Buyer",
      description: "Build trust with customer stories.",
      status: "COMPLETED",
      reach: 52000,
      engagement: 3.9,
      leads: 38,
      appointments: 9,
      soldDeals: 3,
    },
    {
      id: "camp_07",
      name: "Brand Visuals",
      dealershipId: atlanta.id,
      objective: "Brand Awareness",
      platforms: ["Instagram", "Whatnot"],
      startDate: "2026-07-15",
      endDate: "2026-10-15",
      budget: 9000,
      targetAudience: "Luxury Buyer",
      description: "Premium visual brand campaign.",
      status: "ACTIVE",
      reach: 21000,
      engagement: 8.2,
      leads: 19,
      appointments: 5,
      soldDeals: 1,
    },
    {
      id: "camp_08",
      name: "Lease Month",
      dealershipId: miami.id,
      objective: "Offer Promotion",
      platforms: ["TikTok", "Instagram", "Facebook"],
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      budget: 27000,
      targetAudience: "Lease Buyer",
      description: "Highlight flexible lease offers.",
      status: "ACTIVE",
      reach: 64000,
      engagement: 6.7,
      leads: 88,
      appointments: 25,
      soldDeals: 7,
    },
    {
      id: "camp_09",
      name: "Live Inventory",
      dealershipId: chicago.id,
      objective: "Vehicle Promotion",
      platforms: ["Whatnot", "Facebook"],
      startDate: "2026-06-20",
      endDate: "2026-09-20",
      budget: 11000,
      targetAudience: "Budget Buyer",
      description: "Live inventory showcase streams.",
      status: "PAUSED",
      reach: 17000,
      engagement: 4.1,
      leads: 24,
      appointments: 8,
      soldDeals: 2,
    },
    {
      id: "camp_10",
      name: "Fall Luxury Push",
      dealershipId: dallas.id,
      objective: "Lead Generation",
      platforms: ["Instagram", "Facebook", "YouTube"],
      startDate: "2026-09-01",
      endDate: "2026-11-30",
      budget: 38000,
      targetAudience: "Luxury Buyer",
      description: "Fall luxury vehicle push.",
      status: "ACTIVE",
      reach: 12000,
      engagement: 2.5,
      leads: 14,
      appointments: 3,
      soldDeals: 0,
    },
  ];

  for (const camp of campaignDefs) {
    const existingById = await MarketingCampaign.findById(camp.id);
    const existingByName = existingById
      ? null
      : await MarketingCampaign.findByName(camp.name);

    const patch = {
      dealershipId: camp.dealershipId,
      objective: camp.objective,
      platforms: camp.platforms,
      startDate: camp.startDate,
      endDate: camp.endDate,
      budget: camp.budget,
      targetAudience: camp.targetAudience,
      description: camp.description,
      status: camp.status,
      reach: camp.reach,
      engagement: camp.engagement,
      leads: camp.leads,
      appointments: camp.appointments,
      soldDeals: camp.soldDeals,
      revenue: camp.revenue || 0,
    };

    if (existingById) {
      await MarketingCampaign.update(camp.id, patch);
    } else if (existingByName) {
      await MarketingCampaign.update(existingByName.id, patch);
    } else {
      await MarketingCampaign.create({ ...camp, ...patch });
    }
  }

  const campaignRevenues = {
    "Summer SUV Campaign": 420000,
    "Weekend Test Drive": 185000,
    "EV Awareness Push": 160000,
    "Family Adventure": 95000,
    "Open House August": 210000,
    "Trust Builders": 120000,
    "Brand Visuals": 45000,
    "Lease Month": 175000,
    "Live Inventory": 55000,
    "Fall Luxury Push": 20000,
  };
  for (const [name, revenue] of Object.entries(campaignRevenues)) {
    const row = await MarketingCampaign.findByName(name);
    if (row) await MarketingCampaign.update(row.id, { revenue });
  }

  const AiContent = require("../models/AiContent");
  const existingMc = await AiContent.findById("mc_001");
  if (!existingMc) {
    const samples = [
      {
        id: "mc_001",
        title: "Lexus RX Luxury Launch",
        contentType: "Vehicle Promotion",
        body: "Experience the perfect combination of luxury, comfort and technology. Visit our dealership today to explore available options.",
        hashtags: "#LexusRX #LuxurySUV #Model31",
        campaignId: "camp_01",
        campaignName: "Summer SUV Campaign",
        createdBy: "Taylor Quinn",
        vehicle: "2026 Lexus RX",
        offer: "Limited weekend special",
        tone: "Luxury",
        language: "English",
        targetAudience: "Luxury Buyer",
        brief: "Promote Lexus RX luxury launch",
        platform: "Instagram",
        status: "PUBLISHED",
        reach: 12500,
        scheduledAt: new Date("2026-07-13T12:00:00"),
      },
      {
        id: "mc_002",
        title: "BMW X5 Weekend Drive",
        contentType: "Social Post",
        body: "Take the BMW X5 out this weekend and feel the difference.",
        hashtags: "#BMWX5 #WeekendDrive #Model31",
        campaignId: "camp_02",
        campaignName: "Weekend Test Drive",
        createdBy: "Alex Rivera",
        vehicle: "2026 BMW X5",
        tone: "Friendly",
        language: "English",
        targetAudience: "Family Buyer",
        platform: "Facebook",
        status: "SCHEDULED",
        reach: 8200,
        scheduledAt: new Date("2026-07-20T10:00:00"),
      },
      {
        id: "mc_003",
        title: "EV Range Explained",
        contentType: "Educational",
        body: "Everything you need to know about EV range and charging incentives.",
        hashtags: "#EV #Range #Model31",
        campaignId: "camp_03",
        campaignName: "EV Awareness Push",
        createdBy: "Taylor Quinn",
        vehicle: "2026 EV SUV",
        tone: "Professional",
        language: "English",
        targetAudience: "EV Buyer",
        platform: "YouTube",
        status: "APPROVED",
        reach: 5400,
      },
      {
        id: "mc_004",
        title: "Lease Month Specials",
        contentType: "Offer",
        body: "Flexible lease terms and low monthly payments this month.",
        hashtags: "#Lease #Payments #Model31",
        campaignId: "camp_08",
        campaignName: "Lease Month",
        createdBy: "Alex Rivera",
        tone: "Promotional",
        language: "English",
        targetAudience: "Lease Buyer",
        platform: "TikTok",
        status: "PENDING APPROVAL",
        reach: 0,
      },
      {
        id: "mc_005",
        title: "Dealership Open House",
        contentType: "Dealership Promotion",
        body: "Join us for an open house weekend with exclusive on-site offers.",
        hashtags: "#OpenHouse #Model31",
        campaignId: "camp_05",
        campaignName: "Open House August",
        createdBy: "Taylor Quinn",
        tone: "Friendly",
        language: "English",
        targetAudience: "Family Buyer",
        platform: "Instagram",
        status: "DRAFT",
        reach: 0,
      },
    ];

    for (const row of samples) {
      await AiContent.create({
        ...row,
        dealershipId: miami.id,
      });
    }

    await AiContent.addActivity(
      "mc_001",
      "Content created",
      "Taylor Quinn",
      null,
      new Date("2026-07-12T09:00:00")
    );
    await AiContent.addActivity(
      "mc_001",
      "AI content generated",
      "AI System",
      null,
      new Date("2026-07-12T09:01:00")
    );
    await AiContent.addActivity(
      "mc_001",
      "Submitted for approval",
      "Taylor Quinn",
      null,
      new Date("2026-07-12T10:15:00")
    );
    await AiContent.addActivity(
      "mc_001",
      "Approved",
      "Taylor Quinn",
      null,
      new Date("2026-07-12T14:00:00")
    );
    await AiContent.addActivity(
      "mc_001",
      "Published",
      "System",
      null,
      new Date("2026-07-15T12:00:00")
    );
  }

  const approvalQueueSamples = [
    {
      id: "aq_01",
      title: "2026 Lexus RX — Luxury Without Compromise",
      contentType: "Video Script",
      body: "Experience the perfect combination of luxury, comfort and technology with the 2026 Lexus RX. Visit our dealership today to explore available options.",
      hashtags: "#LexusRX #LuxurySUV #Model31",
      campaignId: "camp_04",
      campaignName: "Family Adventure",
      createdBy: "Taylor Quinn",
      vehicle: "2026 Lexus RX",
      tone: "Friendly",
      language: "English",
      targetAudience: "First-Time Buyer",
      brief: "Family adventure video script",
      platform: "Facebook",
      status: "PENDING APPROVAL",
      scenes: [
        "Scene 1: Aerial approach to modern dealership building",
        "Scene 2: Close-up of 2026 Lexus RX exterior and lighting",
        "Scene 3: Interior walkthrough highlighting comfort tech",
        "Scene 4: Friendly CTA to book a test drive",
      ],
    },
    {
      id: "aq_02",
      title: "Tesla Model Y EV Story",
      contentType: "Educational",
      body: "Discover why the Model Y fits busy city drivers who want range and low running costs.",
      hashtags: "#Tesla #ModelY #EV #Model31",
      campaignId: "camp_03",
      campaignName: "EV Awareness Push",
      createdBy: "Alex Rivera",
      vehicle: "Tesla Model Y",
      tone: "Professional",
      language: "English",
      targetAudience: "EV Buyer",
      platform: "Instagram",
      status: "PENDING APPROVAL",
    },
    {
      id: "aq_03",
      title: "Weekend SUV Showcase",
      contentType: "Vehicle Promotion",
      body: "This weekend only — explore our SUV lineup with exclusive test-drive slots.",
      hashtags: "#SUV #WeekendDrive #Model31",
      campaignId: "camp_02",
      campaignName: "Weekend Test Drive",
      createdBy: "Taylor Quinn",
      vehicle: "2026 SUV Lineup",
      tone: "Promotional",
      language: "English",
      targetAudience: "Family Buyer",
      platform: "TikTok",
      status: "PENDING APPROVAL",
    },
    {
      id: "aq_04",
      title: "Luxury Cabin Moodboard",
      contentType: "Image Prompt",
      body: "Soft lighting, leather textures, and refined cabin details for premium buyers.",
      hashtags: "#Luxury #Interior #Model31",
      campaignId: "camp_01",
      campaignName: "Summer SUV Campaign",
      createdBy: "Alex Rivera",
      tone: "Luxury",
      language: "English",
      targetAudience: "Luxury Buyer",
      platform: "Instagram",
      status: "PENDING APPROVAL",
    },
  ];

  for (const row of approvalQueueSamples) {
    const existingAq = await AiContent.findById(row.id);
    if (existingAq) continue;
    await AiContent.create({
      ...row,
      dealershipId: miami.id,
    });
    await AiContent.addActivity(row.id, "Content created", row.createdBy);
    await AiContent.addActivity(row.id, "AI content generated", "AI System");
    await AiContent.addActivity(
      row.id,
      "Submitted for approval",
      row.createdBy
    );
  }

  const ScheduledPost = require("../models/ScheduledPost");
  const existingSp = await ScheduledPost.findById("sp_001");
  if (!existingSp) {
    const dealerDefs = [
      {
        id: "dlr_chicago",
        name: "Chicago Auto Group",
        city: "Chicago",
        state: "IL",
        timezone: "America/Chicago",
      },
      {
        id: "dlr_dallas",
        name: "Dallas Premium Motors",
        city: "Dallas",
        state: "TX",
        timezone: "America/Chicago",
      },
      {
        id: "dlr_la",
        name: "Los Angeles Auto Center",
        city: "Los Angeles",
        state: "CA",
        timezone: "America/Los_Angeles",
      },
      {
        id: "dlr_houston",
        name: "Houston Automotive Group",
        city: "Houston",
        state: "TX",
        timezone: "America/Chicago",
      },
      {
        id: "dlr_atlanta",
        name: "Atlanta Drive Center",
        city: "Atlanta",
        state: "GA",
        timezone: "America/New_York",
      },
    ];

    const dealersByName = { "Miami Luxury Motors": miami };
    for (const def of dealerDefs) {
      let dealer = await Dealership.findByName(def.name);
      if (!dealer) {
        dealer = await Dealership.create({
          ...def,
          address: `${def.city} Main St`,
          zipCode: "00000",
          phone: "(555) 000-0000",
          brands: "Multi-Brand",
          status: "Active",
          crmStatus: "Connected",
          socialStatus: "Connected",
        });
      }
      dealersByName[def.name] = dealer;
    }

    const platforms = [
      "Facebook",
      "Instagram",
      "TikTok",
      "YouTube",
      "X",
      "Whatnot",
    ];
    const dealerNames = [
      "Miami Luxury Motors",
      "Chicago Auto Group",
      "Dallas Premium Motors",
      "Los Angeles Auto Center",
      "Houston Automotive Group",
      "Atlanta Drive Center",
    ];
    const schedulePlan = [
      { day: "2026-08-01", hour: 9 },
      { day: "2026-08-01", hour: 10 },
      { day: "2026-08-02", hour: 11 },
      { day: "2026-08-02", hour: 14 },
      { day: "2026-08-05", hour: 9 },
      { day: "2026-08-05", hour: 15 },
      { day: "2026-08-08", hour: 10 },
      { day: "2026-08-08", hour: 16 },
      { day: "2026-08-10", hour: 9 },
      { day: "2026-08-10", hour: 12 },
      { day: "2026-08-12", hour: 11 },
      { day: "2026-08-12", hour: 17 },
      { day: "2026-08-15", hour: 9 },
      { day: "2026-08-15", hour: 13 },
      { day: "2026-08-18", hour: 10 },
      { day: "2026-08-18", hour: 15 },
      { day: "2026-08-20", hour: 9 },
      { day: "2026-08-20", hour: 14 },
      { day: "2026-08-22", hour: 11 },
      { day: "2026-08-22", hour: 16 },
      { day: "2026-08-25", hour: 10 },
      { day: "2026-08-28", hour: 12 },
    ];

    for (let i = 0; i < 22; i += 1) {
      const plan = schedulePlan[i];
      const dealerName = dealerNames[i % dealerNames.length];
      const dealer = dealersByName[dealerName];
      const platform = platforms[i % platforms.length];
      let status = "SCHEDULED";
      if (i === 2 || i === 7 || i === 14) status = "PUBLISHED";
      if (i === 5 || i === 11 || i === 18) status = "CANCELLED";

      const hour = String(plan.hour).padStart(2, "0");
      await ScheduledPost.create({
        id: `sp_${String(i + 1).padStart(3, "0")}`,
        title: `Scheduled Asset ${i + 1}`,
        platform,
        dealershipId: dealer.id,
        scheduledAt: new Date(`${plan.day}T${hour}:00:00`),
        timezone: dealer.timezone || "America/New_York",
        status,
      });
    }
  }

  const SocialAccount = require("../models/SocialAccount");
  const existingSoc = await SocialAccount.findById("soc_fb_01");
  if (!existingSoc) {
    const socialSamples = [
      {
        id: "soc_fb_01",
        platform: "Facebook",
        accountName: "Miami Luxury Motors",
        ownerName: "Dealership Account",
        status: "DISCONNECTED",
        model31Source: "OFF",
        posts: 42,
        followers: 12800,
        reach: 54000,
        leads: 18,
        engagement: 4.2,
        lastSync: null,
      },
      {
        id: "soc_ig_01",
        platform: "Instagram",
        accountName: "@miamiluxurymotors",
        ownerName: "Dealership Account",
        status: "CONNECTED",
        model31Source: "OFF",
        postingEnabled: true,
        autoPublishing: false,
        defaultContentType: "Vehicle Promotion",
        defaultLanguage: "English",
        defaultTimezone: "America/New_York",
        posts: 186,
        followers: 24500,
        reach: 98000,
        leads: 41,
        engagement: 5.9,
        lastSync: new Date(),
      },
      {
        id: "soc_ig_02",
        platform: "Instagram",
        accountName: "John Smith",
        ownerName: "John Smith",
        status: "CONNECTED",
        model31Source: "ON",
        posts: 64,
        followers: 8200,
        reach: 31000,
        leads: 12,
        engagement: 6.4,
        lastSync: new Date("2026-08-14T09:15:00"),
      },
      {
        id: "soc_wa_01",
        platform: "WhatsApp",
        accountName: "MLM Sales Desk",
        ownerName: "Dealership Account",
        status: "CONNECTED",
        model31Source: "ON",
        posts: 0,
        followers: 0,
        reach: 0,
        leads: 27,
        engagement: 8.1,
        lastSync: new Date("2026-08-20T11:00:00"),
      },
      {
        id: "soc_tt_01",
        platform: "TikTok",
        accountName: "@model31drives",
        ownerName: "Dealership Account",
        status: "CONNECTED",
        model31Source: "OFF",
        posts: 95,
        followers: 51200,
        reach: 210000,
        leads: 33,
        engagement: 7.5,
        lastSync: new Date("2026-08-18T16:40:00"),
      },
      {
        id: "soc_yt_01",
        platform: "YouTube",
        accountName: "Model 31 Dealerships",
        ownerName: "Dealership Account",
        status: "CONNECTED",
        model31Source: "OFF",
        posts: 38,
        followers: 15600,
        reach: 72000,
        leads: 9,
        engagement: 3.8,
        lastSync: new Date("2026-08-12T08:20:00"),
      },
      {
        id: "soc_x_01",
        platform: "X",
        accountName: "@Model31Auto",
        ownerName: "Dealership Account",
        status: "DISCONNECTED",
        model31Source: "OFF",
        posts: 210,
        followers: 9400,
        reach: 45000,
        leads: 7,
        engagement: 2.9,
        lastSync: new Date("2026-07-30T10:00:00"),
      },
      {
        id: "soc_wn_01",
        platform: "Whatnot",
        accountName: "MLM Live Inventory",
        ownerName: "Dealership Account",
        status: "ERROR",
        model31Source: "OFF",
        posts: 12,
        followers: 1800,
        reach: 6200,
        leads: 4,
        engagement: 4.5,
        lastSync: new Date("2026-08-10T14:05:00"),
      },
    ];

    for (const row of socialSamples) {
      await SocialAccount.create({
        ...row,
        dealershipId: miami.id,
      });
    }
  }

  const existingTop = await AiContent.findById("tc_030");
  if (!existingTop) {
    const platforms = [
      "X",
      "YouTube",
      "Facebook",
      "TikTok",
      "Instagram",
      "Whatnot",
      "WhatsApp",
    ];
    const campaignNames = [
      "Summer SUV Campaign",
      "Weekend Test Drive",
      "Lease Month",
      "EV Awareness Push",
      "Family Adventure",
    ];
    for (let n = 30; n >= 1; n -= 1) {
      const idx = 30 - n;
      const platform = platforms[idx % platforms.length];
      const campaignName = campaignNames[idx % campaignNames.length];
      const campaign = await MarketingCampaign.findByName(campaignName);
      const reach = 71800 - idx * 2200;
      const engagement = Number((4.3 + (idx % 5) * 0.5).toFixed(2));
      const clicks = 1195 - idx * 35;
      const leads = Math.max(1, 19 - Math.floor(idx / 2));
      const appointments = Math.max(0, 6 - Math.floor(idx / 5));
      const created = new Date();
      created.setDate(created.getDate() - (idx % 28));

      await AiContent.create({
        id: `tc_${String(n).padStart(3, "0")}`,
        dealershipId: miami.id,
        title: `Top Content #${n}`,
        contentType: "Social Post",
        body: `Performance sample content #${n}`,
        hashtags: "#Model31 #Performance",
        campaignId: campaign ? campaign.id : null,
        campaignName,
        createdBy: "Taylor Quinn",
        platform,
        status: "PUBLISHED",
        reach,
        impressions: Math.round(reach * 1.8),
        engagement,
        clicks,
        leadsCount: leads,
        appointmentsCount: appointments,
      });

      await pool.query(`UPDATE ai_content SET created_at = ? WHERE id = ?`, [
        created,
        `tc_${String(n).padStart(3, "0")}`,
      ]);
    }
  }

  const MarketingAttribution = require("../models/MarketingAttribution");
  const existingAttr = await MarketingAttribution.findById("attr_01");
  if (!existingAttr) {
    const attrRows = [
      {
        id: "attr_01",
        source: "Instagram",
        pipeline: "MODEL 31",
        campaign: "Summer SUV Campaign",
        platform: "Instagram",
        content: "Post #42",
        leads: 84,
        qualified: 32,
        appointments: 14,
        sold: 5,
        revenue: 248000,
      },
      {
        id: "attr_02",
        source: "TikTok",
        pipeline: "MODEL 31",
        campaign: "EV Awareness Push",
        platform: "TikTok",
        content: "Reel #18",
        leads: 72,
        qualified: 28,
        appointments: 12,
        sold: 4,
        revenue: 186000,
      },
      {
        id: "attr_03",
        source: "Facebook",
        pipeline: "DEALERSHIP",
        campaign: "Weekend Test Drive",
        platform: "Facebook",
        content: "Ad Set A",
        leads: 65,
        qualified: 26,
        appointments: 11,
        sold: 4,
        revenue: 162000,
      },
      {
        id: "attr_04",
        source: "YouTube",
        pipeline: "MODEL 31",
        campaign: "Lease Month",
        platform: "YouTube",
        content: "Video #07",
        leads: 58,
        qualified: 22,
        appointments: 10,
        sold: 3,
        revenue: 145000,
      },
      {
        id: "attr_05",
        source: "Instagram",
        pipeline: "DEALERSHIP",
        campaign: "Family Adventure",
        platform: "Instagram",
        content: "Story #11",
        leads: 52,
        qualified: 21,
        appointments: 9,
        sold: 3,
        revenue: 128000,
      },
      {
        id: "attr_06",
        source: "WhatsApp",
        pipeline: "MODEL 31",
        campaign: "Open House August",
        platform: "WhatsApp",
        content: "Broadcast #03",
        leads: 46,
        qualified: 19,
        appointments: 8,
        sold: 3,
        revenue: 112000,
      },
      {
        id: "attr_07",
        source: "X",
        pipeline: "DEALERSHIP",
        campaign: "Brand Visuals",
        platform: "X",
        content: "Post #09",
        leads: 40,
        qualified: 17,
        appointments: 7,
        sold: 2,
        revenue: 89000,
      },
      {
        id: "attr_08",
        source: "Facebook",
        pipeline: "MODEL 31",
        campaign: "Summer SUV Campaign",
        platform: "Facebook",
        content: "Carousel #05",
        leads: 38,
        qualified: 16,
        appointments: 7,
        sold: 2,
        revenue: 96000,
      },
      {
        id: "attr_09",
        source: "TikTok",
        pipeline: "DEALERSHIP",
        campaign: "Live Inventory",
        platform: "TikTok",
        content: "Live #02",
        leads: 34,
        qualified: 14,
        appointments: 6,
        sold: 2,
        revenue: 78000,
      },
      {
        id: "attr_10",
        source: "Whatnot",
        pipeline: "MODEL 31",
        campaign: "Fall Luxury Push",
        platform: "Whatnot",
        content: "Show #01",
        leads: 30,
        qualified: 12,
        appointments: 5,
        sold: 2,
        revenue: 91000,
      },
      {
        id: "attr_11",
        source: "Instagram",
        pipeline: "MODEL 31",
        campaign: "EV Awareness Push",
        platform: "Instagram",
        content: "Reel #22",
        leads: 28,
        qualified: 12,
        appointments: 6,
        sold: 2,
        revenue: 102000,
      },
      {
        id: "attr_12",
        source: "YouTube",
        pipeline: "DEALERSHIP",
        campaign: "Trust Builders",
        platform: "YouTube",
        content: "Short #14",
        leads: 26,
        qualified: 11,
        appointments: 5,
        sold: 2,
        revenue: 74000,
      },
      {
        id: "attr_13",
        source: "Facebook",
        pipeline: "MODEL 31",
        campaign: "Weekend Test Drive",
        platform: "Facebook",
        content: "Ad Set B",
        leads: 24,
        qualified: 10,
        appointments: 4,
        sold: 1,
        revenue: 52000,
      },
      {
        id: "attr_14",
        source: "Instagram",
        pipeline: "DEALERSHIP",
        campaign: "Lease Month",
        platform: "Instagram",
        content: "Post #33",
        leads: 22,
        qualified: 9,
        appointments: 4,
        sold: 1,
        revenue: 48000,
      },
      {
        id: "attr_15",
        source: "TikTok",
        pipeline: "MODEL 31",
        campaign: "Family Adventure",
        platform: "TikTok",
        content: "Reel #41",
        leads: 20,
        qualified: 8,
        appointments: 3,
        sold: 1,
        revenue: 41000,
      },
      {
        id: "attr_16",
        source: "X",
        pipeline: "DEALERSHIP",
        campaign: "Open House August",
        platform: "X",
        content: "Thread #04",
        leads: 18,
        qualified: 8,
        appointments: 3,
        sold: 1,
        revenue: 39000,
      },
      {
        id: "attr_17",
        source: "WhatsApp",
        pipeline: "DEALERSHIP",
        campaign: "Summer SUV Campaign",
        platform: "WhatsApp",
        content: "Chat #08",
        leads: 16,
        qualified: 7,
        appointments: 3,
        sold: 1,
        revenue: 36000,
      },
      {
        id: "attr_18",
        source: "YouTube",
        pipeline: "MODEL 31",
        campaign: "Brand Visuals",
        platform: "YouTube",
        content: "Video #12",
        leads: 14,
        qualified: 6,
        appointments: 2,
        sold: 1,
        revenue: 55000,
      },
      {
        id: "attr_19",
        source: "Facebook",
        pipeline: "DEALERSHIP",
        campaign: "EV Awareness Push",
        platform: "Facebook",
        content: "Boost #06",
        leads: 12,
        qualified: 5,
        appointments: 2,
        sold: 1,
        revenue: 33000,
      },
      {
        id: "attr_20",
        source: "Whatnot",
        pipeline: "DEALERSHIP",
        campaign: "Live Inventory",
        platform: "Whatnot",
        content: "Show #03",
        leads: 10,
        qualified: 4,
        appointments: 2,
        sold: 0,
        revenue: 0,
      },
      {
        id: "attr_21",
        source: "Instagram",
        pipeline: "MODEL 31",
        campaign: "Fall Luxury Push",
        platform: "Instagram",
        content: "Post #55",
        leads: 8,
        qualified: 3,
        appointments: 1,
        sold: 0,
        revenue: 0,
      },
      {
        id: "attr_22",
        source: "TikTok",
        pipeline: "DEALERSHIP",
        campaign: "Weekend Test Drive",
        platform: "TikTok",
        content: "Reel #60",
        leads: 6,
        qualified: 2,
        appointments: 1,
        sold: 0,
        revenue: 0,
      },
    ];

    for (const row of attrRows) {
      await MarketingAttribution.create(row);
    }
  }

  await DealershipSettings.ensureDefault(miami.id);
  await DealershipCrm.ensureDefault(miami.id);
  await ScoringRules.ensureDefault();
}

module.exports = { seedDemoData };
