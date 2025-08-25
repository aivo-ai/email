import { Client } from '@opensearch-project/opensearch';
import { config } from '../config.js';

export class OpenSearchClient {
  private client: Client;
  
  constructor(opensearchConfig: typeof config.openSearch) {
    this.client = new Client({
      node: opensearchConfig.node,
      auth: opensearchConfig.auth,
      ssl: opensearchConfig.ssl
    });
  }
  
  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
  
  async createIndex(indexName: string, mapping: any): Promise<void> {
    const exists = await this.client.indices.exists({ index: indexName });
    
    if (!exists.body) {
      await this.client.indices.create({
        index: indexName,
        body: {
          mappings: mapping,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball']
                }
              }
            }
          }
        }
      });
    }
  }
  
  async indexDocument(indexName: string, id: string, document: any): Promise<void> {
    await this.client.index({
      index: indexName,
      id,
      body: document,
      refresh: true
    });
  }
  
  async search(indexName: string, query: any): Promise<any> {
    const startTime = Date.now();
    
    const response = await this.client.search({
      index: indexName,
      body: query
    });
    
    const duration = Date.now() - startTime;
    
    // Log slow queries (above p95 target)
    if (duration > config.search.performanceTarget) {
      console.warn(`Slow search query: ${duration}ms`, { query, duration });
    }
    
    return response.body;
  }
  
  async deleteDocument(indexName: string, id: string): Promise<void> {
    await this.client.delete({
      index: indexName,
      id,
      refresh: true
    });
  }
  
  async updateDocument(indexName: string, id: string, document: any): Promise<void> {
    await this.client.update({
      index: indexName,
      id,
      body: {
        doc: document
      },
      refresh: true
    });
  }
}
