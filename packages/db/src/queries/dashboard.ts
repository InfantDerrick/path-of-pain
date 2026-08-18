import { and, asc, eq, gt, isNull, lte, ne, sql } from "drizzle-orm";
import { db } from "../client";
import {
  company,
  emailMessageRef,
  emailSuggestion,
  interview,
  jobPosting,
  opportunity,
  task,
} from "../schema/tracking";

export async function getDashboard(userId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    activeCount,
    overdueTasks,
    upcomingInterviews,
    failedEnrichment,
    emailSuggestions,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(opportunity)
      .where(
        and(eq(opportunity.userId, userId), eq(opportunity.status, "ACTIVE")),
      ),
    db
      .select({
        id: task.id,
        title: task.title,
        dueAt: task.dueAt,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        companyName: company.name,
      })
      .from(task)
      .innerJoin(opportunity, eq(opportunity.id, task.opportunityId))
      .innerJoin(company, eq(company.id, opportunity.companyId))
      .where(
        and(
          eq(task.userId, userId),
          ne(opportunity.status, "WITHDRAWN"),
          isNull(task.completedAt),
          lte(task.dueAt, now),
        ),
      )
      .orderBy(asc(task.dueAt))
      .limit(10),
    db
      .select({
        id: interview.id,
        scheduledAt: interview.scheduledAt,
        type: interview.type,
        round: interview.round,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        companyName: company.name,
      })
      .from(interview)
      .innerJoin(opportunity, eq(opportunity.id, interview.opportunityId))
      .innerJoin(company, eq(company.id, opportunity.companyId))
      .where(
        and(
          eq(interview.userId, userId),
          ne(opportunity.status, "WITHDRAWN"),
          gt(interview.scheduledAt, now),
          lte(interview.scheduledAt, soon),
        ),
      )
      .orderBy(asc(interview.scheduledAt))
      .limit(10),
    db
      .select({
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        companyName: company.name,
        error: jobPosting.enrichmentError,
      })
      .from(jobPosting)
      .innerJoin(opportunity, eq(opportunity.id, jobPosting.opportunityId))
      .innerJoin(company, eq(company.id, opportunity.companyId))
      .where(
        and(
          eq(opportunity.userId, userId),
          ne(opportunity.status, "WITHDRAWN"),
          eq(jobPosting.enrichmentStatus, "FAILED"),
        ),
      )
      .limit(10),
    db
      .select({
        id: emailSuggestion.id,
        type: emailSuggestion.type,
        confidence: emailSuggestion.confidence,
        summary: emailSuggestion.summary,
        evidence: emailSuggestion.evidence,
        matchReasons: emailSuggestion.matchReasons,
        createdAt: emailSuggestion.createdAt,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        companyName: company.name,
        fromDomain: emailMessageRef.fromDomain,
        subject: emailMessageRef.subject,
        receivedAt: emailMessageRef.receivedAt,
      })
      .from(emailSuggestion)
      .innerJoin(opportunity, eq(opportunity.id, emailSuggestion.opportunityId))
      .innerJoin(company, eq(company.id, opportunity.companyId))
      .innerJoin(
        emailMessageRef,
        eq(emailMessageRef.id, emailSuggestion.messageRefId),
      )
      .where(
        and(
          eq(emailSuggestion.userId, userId),
          eq(emailSuggestion.status, "pending"),
        ),
      )
      .orderBy(asc(emailSuggestion.createdAt))
      .limit(10),
  ]);

  return {
    counts: {
      active: activeCount[0]?.count ?? 0,
      overdueTasks: overdueTasks.length,
      upcomingInterviews: upcomingInterviews.length,
      failedEnrichment: failedEnrichment.length,
      emailSuggestions: emailSuggestions.length,
      needsAttention:
        overdueTasks.length +
        upcomingInterviews.length +
        failedEnrichment.length +
        emailSuggestions.length,
    },
    overdueTasks,
    upcomingInterviews,
    failedEnrichment,
    emailSuggestions,
  };
}
