import { Resolver } from '@hedera-name-service/hns-resolution-sdk';
import { DomainInfo } from '@hedera-name-service/hns-resolution-sdk/dist/types/DomainInfo';

const domainResolver = new Resolver('hedera_main');

export const getAccountIdFromDomain = async (domain: string): Promise<string | undefined> => {
  return await domainResolver.resolveSLD(domain);
}

export const getDomainsForAccount = async (accountIdOrDomain: string): Promise<string[]> => {
  const allDomains = await domainResolver.getAllDomainsForAccount(accountIdOrDomain) as any as DomainInfo[];
  return allDomains.map((d) => d.domain);
}
