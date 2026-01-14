#!/usr/bin/env npx tsx
/**
 * Unified Co-Pilot Data Migration Script
 *
 * Migrates data from legacy tables to the unified co_pilot_sessions table:
 * - coaching_sessions -> co_pilot_sessions (context: 'live_coaching')
 * - practice_sessions -> co_pilot_sessions (context: 'practice')
 *
 * Features:
 * - --dry-run: Preview changes without modifying data
 * - Error handling and logging
 * - Progress tracking
 * - Rollback support
 *
 * Usage:
 *   npx tsx scripts/migrate-to-unified.ts              # Run migration
 *   npx tsx scripts/migrate-to-unified.ts --dry-run    # Preview only
 *   npx tsx scripts/migrate-to-unified.ts --rollback   # Rollback migration
 *
 * @module scripts/migrate-to-unified
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// CONFIGURATION
// ============================================================

interface MigrationConfig {
  dryRun: boolean
  rollback: boolean
  batchSize: number
  verbose: boolean
}

interface MigrationStats {
  coachingTotal: number
  coachingMigrated: number
  coachingSkipped: number
  coachingErrors: number
  practiceTotal: number
  practiceMigrated: number
  practiceSkipped: number
  practiceErrors: number
  startTime: Date
  endTime?: Date
}

interface MigrationError {
  table: string
  recordId: string
  error: string
  timestamp: Date
}

// ============================================================
// LOGGER
// ============================================================

class Logger {
  private verbose: boolean
  private errors: MigrationError[] = []

  constructor(verbose: boolean = false) {
    this.verbose = verbose
  }

  info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`)
  }

  success(message: string): void {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`)
  }

  warn(message: string): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`)
  }

  error(message: string, recordId?: string, table?: string): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`)
    if (recordId && table) {
      this.errors.push({
        table,
        recordId,
        error: message,
        timestamp: new Date(),
      })
    }
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`)
    }
  }

  progress(current: number, total: number, label: string): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    const bar = '='.repeat(Math.floor(percentage / 5)) + '-'.repeat(20 - Math.floor(percentage / 5))
    process.stdout.write(`\r[${bar}] ${percentage}% - ${label} (${current}/${total})`)
    if (current === total) {
      console.log() // New line after completion
    }
  }

  getErrors(): MigrationError[] {
    return this.errors
  }
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

/**
 * Migrates coaching sessions from coaching_sessions to co_pilot_sessions
 */
async function migrateCoachingSessions(
  supabase: SupabaseClient,
  config: MigrationConfig,
  stats: MigrationStats,
  logger: Logger
): Promise<void> {
  logger.info('Starting coaching sessions migration...')

  // Fetch all coaching sessions
  const { data: sessions, error: fetchError } = await supabase
    .from('coaching_sessions')
    .select('*')
    .order('created_at', { ascending: true })

  if (fetchError) {
    logger.error(`Failed to fetch coaching sessions: ${fetchError.message}`)
    throw fetchError
  }

  if (!sessions || sessions.length === 0) {
    logger.info('No coaching sessions found to migrate')
    return
  }

  stats.coachingTotal = sessions.length
  logger.info(`Found ${sessions.length} coaching sessions to migrate`)

  // Process in batches
  for (let i = 0; i < sessions.length; i += config.batchSize) {
    const batch = sessions.slice(i, i + config.batchSize)

    for (const session of batch) {
      try {
        // Check if already migrated
        const { data: existing } = await supabase
          .from('co_pilot_sessions')
          .select('id')
          .eq('id', session.id)
          .single()

        if (existing) {
          logger.debug(`Session ${session.id} already migrated, skipping`)
          stats.coachingSkipped++
          continue
        }

        // Transform data for unified table
        const unifiedSession = {
          id: session.id,
          user_id: session.user_id,
          context: 'live_coaching' as const,
          capture_method: session.bot_id ? 'recall_bot' : 'tab_audio',
          status: mapStatus(session.status),
          meeting_url: session.meeting_url,
          transcript: session.transcript,
          key_info: session.key_info || {},
          analysis: session.analysis,
          script_progress: session.script_progress || 0,
          current_section: session.current_section,
          sections_covered: session.sections_covered || [],
          overall_score: session.overall_score,
          duration_seconds: session.duration_seconds || 0,
          started_at: session.created_at,
          ended_at: session.ended_at,
          created_at: session.created_at,
          updated_at: session.updated_at,
        }

        if (config.dryRun) {
          logger.debug(`[DRY RUN] Would migrate coaching session: ${session.id}`)
          stats.coachingMigrated++
        } else {
          const { error: insertError } = await supabase
            .from('co_pilot_sessions')
            .insert(unifiedSession)

          if (insertError) {
            throw insertError
          }

          stats.coachingMigrated++
          logger.debug(`Migrated coaching session: ${session.id}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to migrate coaching session ${session.id}: ${errorMessage}`, session.id, 'coaching_sessions')
        stats.coachingErrors++
      }

      logger.progress(
        stats.coachingMigrated + stats.coachingSkipped + stats.coachingErrors,
        stats.coachingTotal,
        'Coaching sessions'
      )
    }
  }

  logger.success(`Coaching migration complete: ${stats.coachingMigrated} migrated, ${stats.coachingSkipped} skipped, ${stats.coachingErrors} errors`)
}

/**
 * Migrates practice sessions from practice_sessions to co_pilot_sessions
 */
async function migratePracticeSessions(
  supabase: SupabaseClient,
  config: MigrationConfig,
  stats: MigrationStats,
  logger: Logger
): Promise<void> {
  logger.info('Starting practice sessions migration...')

  // Fetch all practice sessions
  const { data: sessions, error: fetchError } = await supabase
    .from('practice_sessions')
    .select('*')
    .order('created_at', { ascending: true })

  if (fetchError) {
    logger.error(`Failed to fetch practice sessions: ${fetchError.message}`)
    throw fetchError
  }

  if (!sessions || sessions.length === 0) {
    logger.info('No practice sessions found to migrate')
    return
  }

  stats.practiceTotal = sessions.length
  logger.info(`Found ${sessions.length} practice sessions to migrate`)

  // Process in batches
  for (let i = 0; i < sessions.length; i += config.batchSize) {
    const batch = sessions.slice(i, i + config.batchSize)

    for (const session of batch) {
      try {
        // Check if already migrated
        const { data: existing } = await supabase
          .from('co_pilot_sessions')
          .select('id')
          .eq('id', session.id)
          .single()

        if (existing) {
          logger.debug(`Session ${session.id} already migrated, skipping`)
          stats.practiceSkipped++
          continue
        }

        // Transform data for unified table
        const unifiedSession = {
          id: session.id,
          user_id: session.user_id,
          context: 'practice' as const,
          capture_method: 'vapi',
          status: mapStatus(session.status),
          challenge_id: session.challenge_id,
          persona_id: session.persona_id,
          transcript: session.transcript,
          key_info: session.key_info || {},
          analysis: session.analysis,
          script_progress: session.script_progress || 0,
          current_section: session.current_section,
          sections_covered: session.sections_covered || [],
          overall_score: session.overall_score,
          xp_earned: session.xp_earned || 0,
          xp_breakdown: session.xp_breakdown,
          objectives_completed: session.objectives_completed || [],
          bonus_objectives_completed: session.bonus_objectives_completed || [],
          duration_seconds: session.duration_seconds || 0,
          started_at: session.started_at || session.created_at,
          ended_at: session.ended_at,
          created_at: session.created_at,
          updated_at: session.updated_at,
        }

        if (config.dryRun) {
          logger.debug(`[DRY RUN] Would migrate practice session: ${session.id}`)
          stats.practiceMigrated++
        } else {
          const { error: insertError } = await supabase
            .from('co_pilot_sessions')
            .insert(unifiedSession)

          if (insertError) {
            throw insertError
          }

          stats.practiceMigrated++
          logger.debug(`Migrated practice session: ${session.id}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to migrate practice session ${session.id}: ${errorMessage}`, session.id, 'practice_sessions')
        stats.practiceErrors++
      }

      logger.progress(
        stats.practiceMigrated + stats.practiceSkipped + stats.practiceErrors,
        stats.practiceTotal,
        'Practice sessions'
      )
    }
  }

  logger.success(`Practice migration complete: ${stats.practiceMigrated} migrated, ${stats.practiceSkipped} skipped, ${stats.practiceErrors} errors`)
}

/**
 * Rollback migration - removes migrated records from co_pilot_sessions
 */
async function rollbackMigration(
  supabase: SupabaseClient,
  config: MigrationConfig,
  logger: Logger
): Promise<void> {
  logger.warn('Starting migration rollback...')

  if (config.dryRun) {
    logger.info('[DRY RUN] Would rollback all migrated sessions')

    // Count records that would be deleted
    const { count: coachingCount } = await supabase
      .from('co_pilot_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('context', 'live_coaching')

    const { count: practiceCount } = await supabase
      .from('co_pilot_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('context', 'practice')

    logger.info(`[DRY RUN] Would delete ${coachingCount || 0} coaching sessions`)
    logger.info(`[DRY RUN] Would delete ${practiceCount || 0} practice sessions`)
    return
  }

  // Delete coaching sessions
  const { error: coachingError, count: coachingCount } = await supabase
    .from('co_pilot_sessions')
    .delete({ count: 'exact' })
    .eq('context', 'live_coaching')

  if (coachingError) {
    logger.error(`Failed to rollback coaching sessions: ${coachingError.message}`)
  } else {
    logger.success(`Rolled back ${coachingCount || 0} coaching sessions`)
  }

  // Delete practice sessions
  const { error: practiceError, count: practiceCount } = await supabase
    .from('co_pilot_sessions')
    .delete({ count: 'exact' })
    .eq('context', 'practice')

  if (practiceError) {
    logger.error(`Failed to rollback practice sessions: ${practiceError.message}`)
  } else {
    logger.success(`Rolled back ${practiceCount || 0} practice sessions`)
  }

  logger.success('Rollback complete')
}

/**
 * Verify migration integrity
 */
async function verifyMigration(
  supabase: SupabaseClient,
  logger: Logger
): Promise<boolean> {
  logger.info('Verifying migration integrity...')

  // Count original records
  const { count: originalCoaching } = await supabase
    .from('coaching_sessions')
    .select('*', { count: 'exact', head: true })

  const { count: originalPractice } = await supabase
    .from('practice_sessions')
    .select('*', { count: 'exact', head: true })

  // Count migrated records
  const { count: migratedCoaching } = await supabase
    .from('co_pilot_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('context', 'live_coaching')

  const { count: migratedPractice } = await supabase
    .from('co_pilot_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('context', 'practice')

  const coachingMatch = (originalCoaching || 0) === (migratedCoaching || 0)
  const practiceMatch = (originalPractice || 0) === (migratedPractice || 0)

  logger.info(`Coaching: ${originalCoaching || 0} original, ${migratedCoaching || 0} migrated ${coachingMatch ? '✓' : '✗'}`)
  logger.info(`Practice: ${originalPractice || 0} original, ${migratedPractice || 0} migrated ${practiceMatch ? '✓' : '✗'}`)

  if (coachingMatch && practiceMatch) {
    logger.success('Migration verification passed!')
    return true
  } else {
    logger.error('Migration verification failed - record counts do not match')
    return false
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Map legacy status values to unified status values
 */
function mapStatus(status: string | null): string {
  const statusMap: Record<string, string> = {
    'pending': 'starting',
    'starting': 'starting',
    'in_progress': 'active',
    'active': 'active',
    'analyzing': 'analyzing',
    'completed': 'completed',
    'complete': 'completed',
    'ended': 'completed',
    'failed': 'failed',
    'error': 'failed',
  }

  return statusMap[status?.toLowerCase() || ''] || 'completed'
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2)

  return {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    rollback: args.includes('--rollback') || args.includes('-r'),
    batchSize: parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '100', 10),
    verbose: args.includes('--verbose') || args.includes('-v'),
  }
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Unified Co-Pilot Migration Script

Usage:
  npx tsx scripts/migrate-to-unified.ts [options]

Options:
  --dry-run, -d     Preview changes without modifying data
  --rollback, -r    Rollback migration (delete migrated records)
  --batch=N         Set batch size (default: 100)
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

Examples:
  npx tsx scripts/migrate-to-unified.ts              # Run migration
  npx tsx scripts/migrate-to-unified.ts --dry-run   # Preview changes
  npx tsx scripts/migrate-to-unified.ts --rollback  # Rollback migration
  npx tsx scripts/migrate-to-unified.ts -v -d       # Dry run with verbose logging

Environment Variables:
  SUPABASE_URL              Supabase project URL (required)
  SUPABASE_SERVICE_ROLE_KEY Supabase service role key (required)
`)
}

/**
 * Generate migration report
 */
function generateReport(stats: MigrationStats, errors: MigrationError[], config: MigrationConfig): void {
  stats.endTime = new Date()
  const duration = stats.endTime.getTime() - stats.startTime.getTime()

  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION REPORT')
  console.log('='.repeat(60))

  if (config.dryRun) {
    console.log('\n*** DRY RUN - No data was modified ***\n')
  }

  console.log(`
Duration: ${Math.round(duration / 1000)}s

Coaching Sessions:
  Total:     ${stats.coachingTotal}
  Migrated:  ${stats.coachingMigrated}
  Skipped:   ${stats.coachingSkipped}
  Errors:    ${stats.coachingErrors}

Practice Sessions:
  Total:     ${stats.practiceTotal}
  Migrated:  ${stats.practiceMigrated}
  Skipped:   ${stats.practiceSkipped}
  Errors:    ${stats.practiceErrors}

Overall:
  Total Records: ${stats.coachingTotal + stats.practiceTotal}
  Migrated:      ${stats.coachingMigrated + stats.practiceMigrated}
  Skipped:       ${stats.coachingSkipped + stats.practiceSkipped}
  Errors:        ${stats.coachingErrors + stats.practiceErrors}
`)

  if (errors.length > 0) {
    console.log('\nErrors:')
    console.log('-'.repeat(40))
    errors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. [${err.table}] ${err.recordId}: ${err.error}`)
    })
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`)
    }
  }

  console.log('\n' + '='.repeat(60))
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function main(): Promise<void> {
  const config = parseArgs()

  // Show help if requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  const logger = new Logger(config.verbose)

  // Validate environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing required environment variables:')
    if (!supabaseUrl) logger.error('  - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) logger.error('  - SUPABASE_SERVICE_ROLE_KEY')
    console.log('\nPlease set these environment variables and try again.')
    process.exit(1)
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test connection
  logger.info('Testing database connection...')
  const { error: connectionError } = await supabase.from('coaching_sessions').select('id').limit(1)
  if (connectionError) {
    logger.error(`Database connection failed: ${connectionError.message}`)
    process.exit(1)
  }
  logger.success('Database connection successful')

  // Initialize stats
  const stats: MigrationStats = {
    coachingTotal: 0,
    coachingMigrated: 0,
    coachingSkipped: 0,
    coachingErrors: 0,
    practiceTotal: 0,
    practiceMigrated: 0,
    practiceSkipped: 0,
    practiceErrors: 0,
    startTime: new Date(),
  }

  console.log('\n' + '='.repeat(60))
  console.log('UNIFIED CO-PILOT MIGRATION')
  console.log('='.repeat(60))

  if (config.dryRun) {
    logger.warn('DRY RUN MODE - No data will be modified')
  }

  try {
    if (config.rollback) {
      // Rollback mode
      await rollbackMigration(supabase, config, logger)
    } else {
      // Migration mode
      logger.info('Starting migration...')

      // Check if unified table exists
      const { error: tableCheckError } = await supabase
        .from('co_pilot_sessions')
        .select('id')
        .limit(1)

      if (tableCheckError) {
        logger.error('Unified table co_pilot_sessions does not exist.')
        logger.error('Please run the database migration first:')
        logger.error('  npx supabase db push')
        process.exit(1)
      }

      // Run migrations
      await migrateCoachingSessions(supabase, config, stats, logger)
      await migratePracticeSessions(supabase, config, stats, logger)

      // Verify if not dry run
      if (!config.dryRun) {
        await verifyMigration(supabase, logger)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Migration failed: ${errorMessage}`)
    process.exit(1)
  }

  // Generate report
  generateReport(stats, logger.getErrors(), config)

  // Exit with appropriate code
  const hasErrors = stats.coachingErrors > 0 || stats.practiceErrors > 0
  if (hasErrors) {
    logger.warn('Migration completed with errors')
    process.exit(1)
  }

  logger.success('Migration completed successfully!')
  process.exit(0)
}

// Run the migration
main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
