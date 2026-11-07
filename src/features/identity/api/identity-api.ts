import type { paths } from '../../../api/schema'
import { api, executeApi } from '../../../shared/api/client'

type IdentityResponse =
  paths['/v1/publico/colegio']['get']['responses'][200]['content']['application/json']

export type SchoolIdentity = IdentityResponse['data']

export async function fetchSchoolIdentity(
  subdomain: string,
): Promise<SchoolIdentity> {
  const response = await executeApi(() =>
    api.GET('/v1/publico/colegio', {
      params: { query: { subdominio: subdomain } },
    }),
  )
  return response.data
}
