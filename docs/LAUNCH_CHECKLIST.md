# Unified Co-Pilot Launch Checklist

**Version:** 1.0
**Last Updated:** January 2025
**Status:** Pre-Launch

This document provides a comprehensive checklist for launching the unified co-pilot system, including database migration steps, environment setup, testing verification, and rollback procedures.

---

## Table of Contents

1. [Pre-Launch Preparation](#1-pre-launch-preparation)
2. [Database Migration](#2-database-migration)
3. [Environment Setup](#3-environment-setup)
4. [Testing Verification](#4-testing-verification)
5. [Deployment Steps](#5-deployment-steps)
6. [Post-Launch Monitoring](#6-post-launch-monitoring)
7. [Rollback Procedures](#7-rollback-procedures)
8. [Emergency Contacts](#8-emergency-contacts)

---

## 1. Pre-Launch Preparation

### 1.1 Code Review Checklist

- [ ] All Phase 5 code has been reviewed and approved
- [ ] No console.log statements in production code
- [ ] Error handling is comprehensive
- [ ] API responses don't expose internal error details
- [ ] Rate limiting is configured appropriately
- [ ] All TODOs have been addressed or documented

### 1.2 Documentation Checklist

- [ ] API documentation is up to date
- [ ] README reflects new unified system
- [ ] Migration guide is complete
- [ ] Rollback procedures are documented (this document)
- [ ] Team has been briefed on changes

### 1.3 Dependency Verification

- [ ] All npm dependencies are up to date
- [ ] No known security vulnerabilities (`npm audit`)
- [ ] Supabase client version is compatible
- [ ] OpenAI client version is compatible
- [ ] TypeScript compiles without errors

### 1.4 Backup Procedures

- [ ] Database backup scheduled before migration
- [ ] Backup verified and accessible
- [ ] Point-in-time recovery enabled in Supabase
- [ ] Export of legacy tables complete:
  ```bash
  # Export coaching_sessions
  supabase db dump --table coaching_sessions > backup/coaching_sessions.sql

  # Export practice_sessions
  supabase db dump --table practice_sessions > backup/practice_sessions.sql
  ```

---

## 2. Database Migration

### 2.1 Pre-Migration Steps

1. **Schedule maintenance window**
   - [ ] Notify users of scheduled maintenance
   - [ ] Schedule for low-traffic period
   - [ ] Allocate 1-2 hours for migration

2. **Verify backup**
   ```bash
   # Create fresh backup
   supabase db dump > backup/pre_migration_$(date +%Y%m%d_%H%M%S).sql

   # Verify backup file size and content
   ls -la backup/
   head -100 backup/pre_migration_*.sql
   ```

3. **Check table sizes**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT
     'coaching_sessions' as table_name,
     COUNT(*) as row_count
   FROM coaching_sessions
   UNION ALL
   SELECT
     'practice_sessions',
     COUNT(*)
   FROM practice_sessions;
   ```

### 2.2 Run Database Schema Migration

1. **Apply unified schema**
   ```bash
   # From project root
   npx supabase db push
   ```

2. **Verify new tables exist**
   ```sql
   -- Check co_pilot_sessions table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'co_pilot_sessions';

   -- Check co_pilot_suggestions table
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'co_pilot_suggestions';
   ```

3. **Verify indexes created**
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename LIKE 'co_pilot%';
   ```

4. **Verify RLS policies**
   ```sql
   SELECT policyname, tablename, cmd
   FROM pg_policies
   WHERE tablename LIKE 'co_pilot%';
   ```

### 2.3 Run Data Migration

1. **Dry run first**
   ```bash
   npx tsx scripts/migrate-to-unified.ts --dry-run --verbose
   ```

2. **Review dry run output**
   - [ ] Record counts match expectations
   - [ ] No unexpected errors
   - [ ] Migration time is acceptable

3. **Run actual migration**
   ```bash
   npx tsx scripts/migrate-to-unified.ts --verbose
   ```

4. **Verify migration**
   ```sql
   -- Compare counts
   SELECT
     (SELECT COUNT(*) FROM coaching_sessions) as original_coaching,
     (SELECT COUNT(*) FROM co_pilot_sessions WHERE context = 'live_coaching') as migrated_coaching,
     (SELECT COUNT(*) FROM practice_sessions) as original_practice,
     (SELECT COUNT(*) FROM co_pilot_sessions WHERE context = 'practice') as migrated_practice;
   ```

### 2.4 Post-Migration Verification

- [ ] All coaching sessions migrated correctly
- [ ] All practice sessions migrated correctly
- [ ] Key info data preserved
- [ ] Analysis data preserved
- [ ] Timestamps are correct
- [ ] User IDs match original records

---

## 3. Environment Setup

### 3.1 Environment Variables

1. **Copy example to production config**
   ```bash
   # Review .env.example for all required variables
   cat .env.example
   ```

2. **Set unified co-pilot variables**
   ```env
   ENABLE_UNIFIED_COPILOT=true
   COPILOT_SUGGESTION_INTERVAL=3000
   COPILOT_USE_STREAMING=true
   COPILOT_USE_MINI_MODEL=true
   ```

3. **Set feature flags**
   ```env
   FEATURE_PRACTICE_COACHING_TIPS=true
   FEATURE_ADAPTIVE_DIFFICULTY=true
   FEATURE_REAL_CALL_ANALYSIS=false
   ```

4. **Verify in Vercel/hosting platform**
   - [ ] All environment variables set
   - [ ] No variables have placeholder values
   - [ ] Sensitive values are encrypted

### 3.2 Feature Flag Rollout Strategy

| Flag | Day 1 | Day 3 | Day 7 | Full Launch |
|------|-------|-------|-------|-------------|
| ENABLE_UNIFIED_COPILOT | false | 10% | 50% | 100% |
| FEATURE_PRACTICE_COACHING_TIPS | true | true | true | true |
| FEATURE_ADAPTIVE_DIFFICULTY | false | true | true | true |
| FEATURE_REAL_CALL_ANALYSIS | false | false | false | false |

---

## 4. Testing Verification

### 4.1 Automated Tests

1. **Run unit tests**
   ```bash
   npm run test
   ```

2. **Run integration tests**
   ```bash
   npm run test:integration
   ```

3. **Run unified co-pilot tests**
   ```bash
   npx vitest run src/tests/unified-copilot.test.ts
   ```

4. **Expected test results**
   - [ ] All session creation tests pass
   - [ ] All transcript analysis tests pass
   - [ ] All suggestion generation tests pass
   - [ ] All backward compatibility tests pass

### 4.2 Manual Testing Checklist

#### Coaching Flow
- [ ] Start new coaching session from extension
- [ ] Verify session appears in database
- [ ] Send test transcripts
- [ ] Verify key info extraction
- [ ] Verify suggestions appear in real-time
- [ ] End session and verify analysis

#### Practice Flow
- [ ] Start new practice session
- [ ] Complete at least one objective
- [ ] Verify coaching tips appear (if enabled)
- [ ] End session and verify XP calculation
- [ ] Verify session history shows correctly

#### Backward Compatibility
- [ ] Legacy `/api/coaching/start` still works
- [ ] Legacy `/api/coaching/analyze-transcript` still works
- [ ] Legacy `/api/practice/session` still works
- [ ] Existing Chrome extension works without changes

### 4.3 Load Testing

1. **Run load tests (optional)**
   ```bash
   # Using k6 or similar
   k6 run tests/load/unified-copilot.js
   ```

2. **Expected performance**
   - Session creation: < 200ms
   - Transcript analysis: < 1000ms
   - Suggestion generation: < 500ms

---

## 5. Deployment Steps

### 5.1 Pre-Deployment

- [ ] All tests passing
- [ ] Database migration complete
- [ ] Environment variables configured
- [ ] Team notified of deployment

### 5.2 Deployment Process

1. **Deploy to staging first**
   ```bash
   # If using Vercel
   vercel --env staging
   ```

2. **Smoke test on staging**
   - [ ] Health check endpoint responds
   - [ ] Can create session
   - [ ] Can analyze transcript
   - [ ] Suggestions are generated

3. **Deploy to production**
   ```bash
   vercel --prod
   ```

4. **Verify deployment**
   - [ ] New version is live
   - [ ] No 500 errors in logs
   - [ ] API endpoints responding

### 5.3 Gradual Rollout

1. **Enable for internal users first**
   ```env
   ENABLE_UNIFIED_COPILOT=internal
   ```

2. **Enable for 10% of users**
   ```env
   ENABLE_UNIFIED_COPILOT=10
   ```

3. **Monitor for 24-48 hours**

4. **Increase to 50%, then 100%**

---

## 6. Post-Launch Monitoring

### 6.1 Key Metrics to Monitor

| Metric | Alert Threshold | Check Frequency |
|--------|-----------------|-----------------|
| API Error Rate | > 1% | Every 5 min |
| Session Creation Latency | > 500ms | Every 5 min |
| Analysis Latency | > 2000ms | Every 5 min |
| Database Connections | > 80% | Every 1 min |
| OpenAI API Errors | > 5/hour | Continuous |

### 6.2 Dashboard Setup

- [ ] Create unified co-pilot dashboard
- [ ] Add session creation rate chart
- [ ] Add error rate chart
- [ ] Add latency percentiles
- [ ] Set up alerts

### 6.3 Log Monitoring

```bash
# Watch for errors in real-time
vercel logs --follow | grep -E "(ERROR|WARN)"

# Check specific endpoint logs
vercel logs --follow | grep "co-pilot"
```

### 6.4 First 24 Hours Checklist

- [ ] Hour 1: Verify no critical errors
- [ ] Hour 2: Check session creation rate
- [ ] Hour 4: Review first user feedback
- [ ] Hour 8: Check suggestion quality
- [ ] Hour 12: Mid-day metrics review
- [ ] Hour 24: Full day review

---

## 7. Rollback Procedures

### 7.1 Quick Rollback (Feature Flag)

**When to use:** Minor issues, non-critical bugs

1. **Disable unified co-pilot**
   ```env
   ENABLE_UNIFIED_COPILOT=false
   ```

2. **Redeploy**
   ```bash
   vercel --prod
   ```

3. **Verify legacy endpoints working**
   - [ ] `/api/coaching/*` endpoints responding
   - [ ] `/api/practice/*` endpoints responding

**Time to rollback:** ~5 minutes

### 7.2 Partial Rollback (Data Issues)

**When to use:** Data integrity issues, missing records

1. **Stop new unified sessions**
   ```env
   ENABLE_UNIFIED_COPILOT=false
   ```

2. **Investigate data issues**
   ```sql
   -- Find problematic records
   SELECT id, created_at, status
   FROM co_pilot_sessions
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

3. **Fix data or re-run migration**
   ```bash
   npx tsx scripts/migrate-to-unified.ts --verbose
   ```

**Time to rollback:** ~30 minutes

### 7.3 Full Rollback (Critical Issues)

**When to use:** Complete system failure, data corruption

1. **Disable unified system immediately**
   ```env
   ENABLE_UNIFIED_COPILOT=false
   ```

2. **Rollback migration data**
   ```bash
   npx tsx scripts/migrate-to-unified.ts --rollback
   ```

3. **Verify rollback**
   ```sql
   SELECT COUNT(*) FROM co_pilot_sessions;
   -- Should be 0 or near 0
   ```

4. **Restore from backup if needed**
   ```bash
   # Restore database from backup
   psql $DATABASE_URL < backup/pre_migration_*.sql
   ```

5. **Deploy previous version**
   ```bash
   # If using Vercel
   vercel rollback
   ```

**Time to rollback:** ~1-2 hours

### 7.4 Rollback Decision Matrix

| Issue | Severity | Action |
|-------|----------|--------|
| UI bugs | Low | Fix forward |
| Missing suggestions | Medium | Quick rollback |
| Session creation failing | High | Quick rollback |
| Data corruption | Critical | Full rollback |
| Security vulnerability | Critical | Full rollback + incident response |

---

## 8. Emergency Contacts

### 8.1 On-Call Team

| Role | Name | Contact |
|------|------|---------|
| Engineering Lead | [Name] | [Email/Phone] |
| Backend Developer | [Name] | [Email/Phone] |
| DevOps | [Name] | [Email/Phone] |
| Product Manager | [Name] | [Email/Phone] |

### 8.2 External Support

| Service | Support URL | Priority |
|---------|-------------|----------|
| Supabase | support.supabase.com | P1 for outages |
| Vercel | vercel.com/support | P1 for deployments |
| OpenAI | platform.openai.com/docs | Status page |

### 8.3 Incident Response

1. **Identify issue**
   - Check error logs
   - Identify affected users
   - Determine severity

2. **Communicate**
   - Notify team in Slack
   - Update status page if needed

3. **Mitigate**
   - Apply appropriate rollback
   - Verify systems stable

4. **Document**
   - Create incident report
   - Schedule post-mortem

---

## Appendix A: SQL Queries for Verification

### Count migrated records
```sql
SELECT
  context,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM co_pilot_sessions
GROUP BY context;
```

### Check for orphaned records
```sql
-- Suggestions without sessions
SELECT COUNT(*)
FROM co_pilot_suggestions s
LEFT JOIN co_pilot_sessions sess ON s.session_id = sess.id
WHERE sess.id IS NULL;
```

### Performance check
```sql
-- Average analysis latency (if tracked)
SELECT
  DATE(created_at) as date,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_latency_seconds
FROM co_pilot_sessions
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

---

## Appendix B: Common Issues & Solutions

### Issue: Migration script fails with "table does not exist"
**Solution:** Run database schema migration first
```bash
npx supabase db push
```

### Issue: Suggestions not appearing in real-time
**Solution:** Verify realtime is enabled
```sql
-- Check realtime publication
SELECT * FROM pg_publication_tables
WHERE tablename = 'co_pilot_suggestions';
```

### Issue: High latency on analysis endpoint
**Solution:** Check OpenAI rate limits and consider:
- Enabling COPILOT_USE_MINI_MODEL=true
- Increasing COPILOT_SUGGESTION_INTERVAL

### Issue: Legacy endpoints returning 500
**Solution:** Check ENABLE_UNIFIED_COPILOT flag and adapter routing

---

**Document Owner:** Engineering Team
**Review Schedule:** Before each deployment
**Last Reviewed:** January 2025
