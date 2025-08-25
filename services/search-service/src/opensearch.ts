import { Client } from '@opensearch-project/opensearch';

export const opensearch = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
});

export async function searchMessages({
  userId,
  query,
  aclFilter,
  chips,
  highlight = true,
  size = 50,
}: {
  userId: string;
  query: string;
  aclFilter: object;
  chips?: string[];
  highlight?: boolean;
  size?: number;
}) {
  // Build OpenSearch query with ACL filter and chips
  const must: any[] = [
    { term: { userId } },
    ...(query ? [{ match: { content: query } }] : []),
    ...(chips ? chips.map(chip => ({ term: { chips: chip } })) : []),
  ];
  const filter: any[] = aclFilter ? [aclFilter] : [];
  return opensearch.search({
    index: 'messages',
    size,
    body: {
      query: {
        bool: {
          must,
          filter,
        },
      },
      highlight: highlight
        ? {
            fields: {
              content: {},
            },
          }
        : undefined,
    },
  });
}
