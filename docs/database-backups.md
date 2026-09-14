# Database backups

The daily GitHub Actions workflow creates an encrypted PostgreSQL dump and stores it in Cloudflare R2. It uses the direct Neon connection, rather than the pooled application connection, because `pg_dump` is not compatible with PgBouncer-style pooling.

## One-time setup

1. Create a private Cloudflare R2 bucket, for example `wikiguesser-backups`.
2. Create an R2 API token with **Object Read & Write** access limited to that bucket. Do not give the token account-wide permissions.
3. In the GitHub repository, add these Actions secrets:

   | Secret | Value |
   | --- | --- |
   | `DATABASE_BACKUP_URL` | Neon **direct/unpooled** connection string |
   | `BACKUP_ENCRYPTION_PASSPHRASE` | A long, randomly generated passphrase stored separately from R2 credentials |
   | `R2_ACCESS_KEY_ID` | R2 API token access-key ID |
   | `R2_SECRET_ACCESS_KEY` | R2 API token secret |
   | `R2_ENDPOINT` | The S3 API endpoint shown by R2, such as `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
   | `R2_BUCKET` | The bucket name |

4. In R2, add a lifecycle rule for the `database/` prefix to delete objects after 30 days. This retains 30 daily restore points and prevents unattended storage growth.
5. Run **Actions → Database backup → Run workflow** once and confirm the two uploaded files: a `.dump.gpg` archive and its `.sha256` checksum.

Cloudflare R2's free tier includes 10 GB-month of standard storage, 1 million writes, and 10 million reads per month. A daily backup with a 30-day retention period is normally free for this app while the compressed encrypted dumps total less than 10 GB. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/) for current limits.

## Restore procedure

Restores should be performed into a new Neon branch or an empty recovery database first; do not restore over production without validating the dump.

```bash
sha256sum --check wikiguesser-YYYY-MM-DDTHH-MM-SSZ.dump.gpg.sha256
gpg --decrypt --batch --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
  --output backup.dump wikiguesser-YYYY-MM-DDTHH-MM-SSZ.dump.gpg
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname "$RECOVERY_DATABASE_URL" backup.dump
```

The backup workflow runs at 01:17 UTC each day. GitHub schedules are best-effort, so the first manual run is an important verification step. Neon point-in-time restore remains useful for very recent mistakes; this workflow is the independent, off-provider recovery copy.
