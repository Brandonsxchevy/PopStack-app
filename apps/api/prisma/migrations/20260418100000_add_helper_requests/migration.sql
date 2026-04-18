-- Helper requests migration
CREATE TYPE "HelperRole" AS ENUM ('FRONTEND', 'TESTER', 'DESIGNER', 'FULLSTACK', 'OTHER');
CREATE TYPE "HelperRequestStatus" AS ENUM ('OPEN', 'RESPONDED', 'ACCEPTED', 'DECLINED', 'PAID', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TABLE "HelperRequest" (
  "id" TEXT NOT NULL,
  "originalSessionId" TEXT NOT NULL,
  "originalDevId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "role" "HelperRole" NOT NULL,
  "scopeDescription" TEXT,
  "status" "HelperRequestStatus" NOT NULL DEFAULT 'OPEN',
  "helperDevId" TEXT,
  "helperSessionId" TEXT,
  "tier" "SessionTier",
  "stripePaymentIntentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelperRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HelperRequest_helperSessionId_key" ON "HelperRequest"("helperSessionId");
ALTER TABLE "HelperRequest" ADD CONSTRAINT "HelperRequest_originalSessionId_fkey" FOREIGN KEY ("originalSessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelperRequest" ADD CONSTRAINT "HelperRequest_originalDevId_fkey" FOREIGN KEY ("originalDevId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelperRequest" ADD CONSTRAINT "HelperRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelperRequest" ADD CONSTRAINT "HelperRequest_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelperRequest" ADD CONSTRAINT "HelperRequest_helperDevId_fkey" FOREIGN KEY ("helperDevId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelperRequest" ADD CONSTRAINT "HelperRequest_helperSessionId_fkey" FOREIGN KEY ("helperSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;