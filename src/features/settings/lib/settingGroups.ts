/**
 * How Staff › Settings groups the named settings and which editor each one gets (story S1-E11-03).
 *
 * Who reads it: components/ValueSettingsSection.tsx.
 * The settings themselves live in public.settings; every story that adds one also adds it to a
 * group here and gives it a label in src/locales/<lang>/settings.json (values.<key>). A setting
 * missing from these groups still shows, under "Other", so a new one is never hidden.
 * Two settings have their own editors and are left out of the groups: discover_shelves (the
 * Discover mix, DiscoverMixEditor) and rate_limits (RateLimitsEditor). reserved_brand_words is
 * left out on purpose: it holds the product's names, which change only with a rename (CLAUDE.md,
 * "Names and domains are settings, not code").
 */

/** The groups, in the order the page shows them, each with its settings in order. */
export const settingGroups: { id: string; keys: string[] }[] = [
  {
    id: 'content',
    keys: [
      'teaser_length',
      'chapter_max_characters',
      'comment_max_characters',
      'paragraph_comment_max_characters',
      'comment_page_size',
      'ai_label_confirmed_reports',
      'handle_change_days',
      'pen_name_change_days',
      'classics_account_handle',
      'picture_allowed_kinds',
    ],
  },
  {
    id: 'ranking',
    keys: [
      'ranking_weight_reads',
      'ranking_weight_likes',
      'ranking_weight_comments',
      'ranking_weight_shares',
      'ranking_weight_read_through',
      'ranking_half_life_days',
      'ranking_window_days',
      'rising_writer_days',
    ],
  },
  {
    id: 'abuse',
    keys: [
      'new_account_hours',
      'comment_hourly_limit',
      'comment_hourly_limit_new_account',
      'comment_new_account_hours',
      'new_account_max_links',
      'report_hourly_limit',
      'reporting_pause_days',
      'downvote_new_account_hours',
      'downvote_case_threshold',
      'sign_in_pause_tries',
      'sign_in_pause_minutes',
      'client_errors_per_minute',
    ],
  },
  {
    id: 'moderation',
    keys: [
      'moderation_hours_one_hour',
      'moderation_hours_same_day',
      'moderation_hours_two_days',
      'moderation_hours_seven_days',
      'case_claim_minutes',
      'suspension_default_days',
      'suspension_day_choices',
      'picture_reject_reasons',
      'on_call_escalation_minutes',
      'safety_contact_warning_days',
      'staff_session_hours',
      'staff_fresh_sign_in_minutes',
    ],
  },
  {
    id: 'notifications',
    keys: ['notification_follower_group_hours', 'notification_reaction_group_minutes'],
  },
  {
    id: 'retention',
    keys: [
      'content_purge_days',
      'notifications_keep_days',
      'client_errors_keep_days',
      'public_notices_keep_years',
      'removal_order_preserve_months',
      'daily_metrics_keep_years',
    ],
  },
  {
    id: 'march',
    keys: ['march_target_writers', 'march_target_readers', 'march_target_return_rate'],
  },
];

/** Settings with their own editor, or none on purpose, so they never show in a group. */
export const settingsWithOwnEditor = ['discover_shelves', 'rate_limits', 'reserved_brand_words'];

/**
 * The keys no group lists, for the "Other" group.
 *
 * @param allKeys - every setting key in the database
 * @returns the keys left over, alphabetically
 */
export function ungroupedKeys(allKeys: string[]): string[] {
  const grouped = new Set([
    ...settingGroups.flatMap((group) => group.keys),
    ...settingsWithOwnEditor,
  ]);
  return allKeys.filter((key) => !grouped.has(key)).sort();
}

/** The Discover shelves staff can choose from (S1-E5-03); "categories" is one shelf per category. */
export const discoverShelfWords = [
  'following',
  'picked',
  'popular',
  'rising',
  // IDEAS-1e: "Most shared this week".
  'shared',
  'new',
  'completed',
  'updated',
  'classics',
  'categories',
] as const;
