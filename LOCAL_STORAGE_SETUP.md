# Local File Storage Setup

This application now uses local file storage instead of Cloudinary for simplicity. This approach stores uploaded files directly on your server, making it much easier to set up and maintain.

## Advantages of Local Storage

1. **Simplicity** - No third-party API integrations required
2. **Support for all file types** - No file type restrictions like with Cloudinary
3. **Direct file access** - No redirection or authentication needed for downloads
4. **Easy maintenance** - Files are stored in a simple directory structure

## Setup Instructions

### 1. Ensure the uploads directory exists

The system will automatically create an `uploads` directory in your server folder, but you can manually create it:

```bash
mkdir -p server/uploads
```

### 2. Set appropriate permissions

Make sure the directory is writable by your application:

```bash
chmod 755 server/uploads
```

### 3. (Optional) Configure file retention policy

For production systems, you may want to set up a cron job or scheduled task to clean up old files periodically:

```bash
# Example cron job to delete files older than 30 days
0 0 * * * find /path/to/your/server/uploads -type f -mtime +30 -delete
```

## Important Notes

1. **Disk Space**: This approach uses your server's disk space directly. Monitor usage to ensure you don't run out of space.

2. **Backups**: Remember to include the `uploads` directory in your backup strategy.

3. **Server Migration**: When migrating to a new server, don't forget to transfer the files in the `uploads` directory.

4. **Scalability**: For high-traffic applications, consider implementing a CDN or moving to a more robust solution.

## Troubleshooting

### File Upload Issues

- Check that the `uploads` directory exists and has proper write permissions
- Verify that the server has enough disk space
- Look for any errors in the server logs

### Download Issues

- Ensure the file exists in the uploads directory
- Check that the static file middleware is correctly configured
- Verify the file URL is correctly constructed

### Migration from Cloudinary

Existing files stored in Cloudinary will still be accessible. The system detects the storage provider based on the `storageProvider` field in the order document. 