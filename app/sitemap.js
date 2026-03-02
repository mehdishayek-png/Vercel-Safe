export default function sitemap() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com';
    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        }
    ];
}
