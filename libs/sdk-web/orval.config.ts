import { defineConfig } from 'orval'

export default defineConfig({
  ceerion: {
    input: '../../contracts/openapi.yaml',
    output: {
      mode: 'split',
      target: 'src/generated/api.ts',
      schemas: 'src/generated/models',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/http-client.ts',
          name: 'customInstance'
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true
        }
      }
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write'
    }
  }
})
