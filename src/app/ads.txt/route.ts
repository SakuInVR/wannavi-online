function getPublisherId() {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  if (!client) {
    return undefined;
  }

  return client.replace(/^ca-/, "");
}

export function GET() {
  const publisherId = getPublisherId();
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Add NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT to generate ads.txt\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
