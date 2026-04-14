-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'DEVELOPER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SuspensionStatus" AS ENUM ('ACTIVE', 'WARNED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'LOCKED', 'AWAITING_ACCEPT', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BudgetTier" AS ENUM ('FIVE', 'TWENTY', 'FIFTY_PLUS');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('MARKETPLACE', 'DIRECT_LINK');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WIX', 'WORDPRESS', 'SHOPIFY', 'SQUARESPACE', 'WEBFLOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FingerprintStatus" AS ENUM ('PENDING', 'COMPLETE', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SessionTier" AS ENUM ('QUICK_FOLLOWUP', 'FIFTEEN_MIN', 'FULL_SOLUTION');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING_ACCEPT', 'ACTIVE', 'ENDED', 'CANCELLED', 'ESCALATING');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_DEV', 'PENDING_USER', 'SIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'PARTIAL', 'BLOCKED', 'PENDING_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "FinalizationType" AS ENUM ('FULL', 'PARTIAL', 'DEFERRED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'STABILIZED', 'BLOCKED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "FixType" AS ENUM ('TEMPORARY', 'PERMANENT');

-- CreateEnum
CREATE TYPE "BlockedReason" AS ENUM ('DNS_ACCESS', 'PLATFORM_ACCESS', 'SCOPE_EXCEEDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('PRIMARY_DEV', 'TESTER', 'FRONTEND', 'BACKEND');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('INVITED', 'ACTIVE', 'DECLINED', 'REMOVED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('NONE', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PRESENTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('NEW', 'AWAITING_RESPONSE', 'AWAITING_PAYMENT', 'ACTIVE', 'BLOCKED', 'PARTIAL', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UserSection" AS ENUM ('ACTIVE_WORK', 'WAITING_ON_YOU', 'COMPLETED', 'DRAFT');

-- CreateEnum
CREATE TYPE "DevSection" AS ENUM ('NEW_REQUESTS', 'AWAITING_PAYMENT', 'ACTIVE_WORK', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('FREE_RESPONSE', 'PAID_MESSAGE', 'SYSTEM_EVENT', 'INTERNAL_DEV_NOTE');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EXTERNAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('NONE', 'AVAILABLE', 'GENERATED');

-- CreateEnum
CREATE TYPE "SystemEventType" AS ENUM ('SESSION_STARTED', 'SESSION_ENDED', 'ACCESS_REQUIRED', 'TASK_BLOCKED', 'TASK_STABILIZED', 'PARTIAL_SUBMITTED', 'PAYMENT_RELEASED', 'COLLAB_JOINED', 'CONTRACT_ESCALATED', 'PROPOSAL_PRESENTED', 'PROPOSAL_ACCEPTED');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('GENERAL', 'CONTEXTUAL');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('WEBSITE_FIX', 'BUG_FIX', 'QUICK_QUESTION');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('REQUESTED', 'GRANTED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "stripeAccountId" TEXT,
    "stripeCustomerId" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "autoTranslate" BOOLEAN NOT NULL DEFAULT false,
    "avgRating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT[],
    "suspensionStatus" "SuspensionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "avatarKey" TEXT,
    "websiteUrl" TEXT,
    "location" TEXT,
    "cvKey" TEXT,
    "techTags" TEXT[],
    "yearsExperience" INTEGER,
    "hourlyRateHint" INTEGER,
    "portfolioLinks" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "retainerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "retainerMaxClients" INTEGER NOT NULL DEFAULT 5,
    "slaHours" INTEGER NOT NULL DEFAULT 12,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stackTags" TEXT[],
    "budgetTier" "BudgetTier" NOT NULL,
    "urgency" "Urgency" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "url" TEXT,
    "screenshotKeys" TEXT[],
    "clarityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clarityBreakdown" JSONB,
    "fingerprintId" TEXT,
    "source" "QuestionSource" NOT NULL DEFAULT 'MARKETPLACE',
    "linkId" TEXT,
    "preSelectedDevId" TEXT,
    "requiresAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fingerprint" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" "Platform" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "signals" JSONB NOT NULL,
    "rawHeaders" JSONB,
    "userOverride" "Platform",
    "overrideAt" TIMESTAMP(3),
    "status" "FingerprintStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "textCharCount" INTEGER NOT NULL DEFAULT 0,
    "effortEstimate" TEXT,
    "offerPriceCents" INTEGER,
    "offerTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Swipe" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Swipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "tier" "SessionTier" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING_ACCEPT',
    "durationSeconds" INTEGER NOT NULL DEFAULT 900,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "stripePaymentIntentId" TEXT,
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "proposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "contractId" TEXT,
    "developerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "expedited" BOOLEAN NOT NULL DEFAULT false,
    "expeditedSlaMinutes" INTEGER,
    "complexityReasons" TEXT[],
    "impactLevel" "ImpactLevel" NOT NULL DEFAULT 'NONE',
    "impactNote" TEXT,
    "expeditedPremiumCents" INTEGER NOT NULL DEFAULT 0,
    "complexityPremiumCents" INTEGER NOT NULL DEFAULT 0,
    "impactPremiumCents" INTEGER NOT NULL DEFAULT 0,
    "totalPriceCents" INTEGER NOT NULL,
    "whyMoreExpensive" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "presentedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "timeEstimateHours" INTEGER,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEscalation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "sessionTimeAtEscalation" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "escalatedFromSessionId" TEXT,
    "finalizationType" "FinalizationType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "statusNote" TEXT,
    "fixType" "FixType",
    "ownerParticipantId" TEXT,
    "allocatedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "stripePaymentIntentId" TEXT,
    "billableOnBlock" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" "BlockedReason",
    "requiresAccessType" TEXT,
    "evidenceKeys" TEXT[],
    "timeSpentMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "taskDescription" TEXT,
    "canViewUserChat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSplit" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "transferredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPaymentSplit" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskPaymentSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "message" TEXT,
    "offeredAmountCents" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedFix" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "testerParticipantId" TEXT NOT NULL,
    "devicesTested" TEXT[],
    "screenshotKeys" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedFix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "overall" INTEGER NOT NULL,
    "dimension1" INTEGER NOT NULL,
    "dimension2" INTEGER NOT NULL,
    "dimension3" INTEGER NOT NULL,
    "comment" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "ratingId" TEXT NOT NULL,
    "flaggedUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sessionId" TEXT,
    "contractId" TEXT,
    "jobId" TEXT,
    "status" "ThreadStatus" NOT NULL DEFAULT 'NEW',
    "userSection" "UserSection" NOT NULL DEFAULT 'ACTIVE_WORK',
    "devSection" "DevSection" NOT NULL DEFAULT 'NEW_REQUESTS',
    "userUnreadCount" INTEGER NOT NULL DEFAULT 0,
    "devUnreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT,
    "type" "MessageType" NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "systemEventType" "SystemEventType",
    "systemEventData" JSONB,
    "visibleToUser" BOOLEAN NOT NULL DEFAULT true,
    "isTemplateSaved" BOOLEAN NOT NULL DEFAULT false,
    "channel" "MessageChannel" NOT NULL DEFAULT 'EXTERNAL',
    "originalText" TEXT,
    "detectedLanguage" TEXT,
    "translatedText" TEXT,
    "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NONE',
    "translationTargetLang" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseTemplate" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "sourceMessageId" TEXT,
    "title" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "platformTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevLink" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "type" "LinkType" NOT NULL DEFAULT 'GENERAL',
    "shortcode" TEXT NOT NULL,
    "label" TEXT,
    "requestType" "RequestType",
    "optionalTags" TEXT[],
    "requiresUrl" BOOLEAN NOT NULL DEFAULT false,
    "requiresScreenshot" BOOLEAN NOT NULL DEFAULT false,
    "requiresAccess" BOOLEAN NOT NULL DEFAULT false,
    "suggestedPriceMin" INTEGER,
    "suggestedPriceMax" INTEGER,
    "customHeadline" TEXT,
    "customCta" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retainer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "monthlyPriceCents" INTEGER NOT NULL DEFAULT 30000,
    "slaHours" INTEGER NOT NULL DEFAULT 12,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requestsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "messagesToday" INTEGER NOT NULL DEFAULT 0,
    "maxDailyMessages" INTEGER NOT NULL DEFAULT 10,
    "maxActiveThreads" INTEGER NOT NULL DEFAULT 5,
    "periodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRenewalAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaEvent" (
    "id" TEXT NOT NULL,
    "retainerId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "met" BOOLEAN,
    "breachCredited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformConfirmed" "Platform",
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_questionId_developerId_key" ON "Response"("questionId", "developerId");

-- CreateIndex
CREATE UNIQUE INDEX "Swipe_developerId_questionId_key" ON "Swipe"("developerId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractEscalation_sessionId_key" ON "ContractEscalation"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractEscalation_contractId_key" ON "ContractEscalation"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_contractId_key" ON "Job"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_sessionId_raterId_key" ON "Rating"("sessionId", "raterId");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_questionId_key" ON "Thread"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_sessionId_key" ON "Thread"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Thread_contractId_key" ON "Thread"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "DevLink_shortcode_key" ON "DevLink"("shortcode");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_fingerprintId_fkey" FOREIGN KEY ("fingerprintId") REFERENCES "Fingerprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "DevLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEscalation" ADD CONSTRAINT "ContractEscalation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEscalation" ADD CONSTRAINT "ContractEscalation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerParticipantId_fkey" FOREIGN KEY ("ownerParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPaymentSplit" ADD CONSTRAINT "TaskPaymentSplit_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPaymentSplit" ADD CONSTRAINT "TaskPaymentSplit_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedFix" ADD CONSTRAINT "VerifiedFix_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "Rating"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMessage" ADD CONSTRAINT "ThreadMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseTemplate" ADD CONSTRAINT "ResponseTemplate_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevLink" ADD CONSTRAINT "DevLink_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retainer" ADD CONSTRAINT "Retainer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retainer" ADD CONSTRAINT "Retainer_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaEvent" ADD CONSTRAINT "SlaEvent_retainerId_fkey" FOREIGN KEY ("retainerId") REFERENCES "Retainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaEvent" ADD CONSTRAINT "SlaEvent_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
