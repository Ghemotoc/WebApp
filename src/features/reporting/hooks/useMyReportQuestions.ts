/**
 * useMyReportQuestions: the moderation team's open questions about the signed-in person's reports,
 * and the answer (story S1-E10-08: "Ask for more details").
 *
 * Who calls it: ReportQuestionsSection in Settings. What it calls: my_report_detail_requests() and
 * answer_report_detail_request(). The answer is never logged (CLAUDE.md rule 12).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { ReportReason } from '@/schemas/report';

/** One open question. */
export interface ReportQuestion {
  id: string;
  reportReference: string;
  reason: ReportReason;
  question: string;
  askedAt: string;
}

/** The query key, shared with the answer's refresh. */
const questionsKey = ['my-report-questions'];

/**
 * Follows the questions.
 *
 * @returns the questions (empty while loading), whether loading failed, answer() and its state
 */
export function useMyReportQuestions() {
  const queryClient = useQueryClient();
  const questions = useQuery({
    queryKey: questionsKey,
    queryFn: async () => {
      const client = await requireClient();
      const { data, error } = await client.rpc('my_report_detail_requests');
      if (error !== null) throw new Error(`Could not read the questions: ${error.message}`);
      return data.map((row): ReportQuestion => ({
        id: row.request_id,
        reportReference: row.report_reference,
        reason: row.reason,
        question: row.question,
        askedAt: row.asked_at,
      }));
    },
  });
  const answer = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const client = await requireClient();
      const { error } = await client.rpc('answer_report_detail_request', {
        target_request_id: id,
        answer_text: text,
      });
      if (error !== null) throw new Error(`Could not send the answer: ${error.message}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: questionsKey }),
  });
  return {
    questions: questions.data ?? [],
    loadFailed: questions.isError,
    answer: (id: string, text: string) => answer.mutateAsync({ id, text }),
    isAnswering: answer.isPending,
    answerFailed: answer.isError,
    hasAnswered: answer.isSuccess,
  };
}
