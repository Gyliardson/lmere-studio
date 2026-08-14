-- E2E isolation only: each spec must start with fresh abuse-control buckets so
-- one spec's intentional traffic cannot contaminate unrelated assertions.
DELETE FROM "RateLimitBucket";
