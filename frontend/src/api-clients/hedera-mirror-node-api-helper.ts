import _ from "lodash";
import { decodeBase64 } from "../utils";
import { HederaMirrorNodeAPIClient, Links, Nft, Order, SwaggerResponse, TokenInfo, Transaction, TransactionTypes } from "./hedera-mirror-node-api-client";
import BPromise from 'bluebird';

export type NftWithMetadata = Nft & { metadataObj?: any, metadataErrObj?: any, tokenInfo: TokenInfo };

export const client = new HederaMirrorNodeAPIClient();

export const ipfsGateways = [
  'https://ipfscdn-c7eyhsdeeff0crhj.z01.azurefd.net/ipfs/', // Please do not use this ipfs gateway for other projects; this is a paid gateway for NFT Explorer
  // 'https://cloudflare-ipfs.com/ipfs/',
  // 'https://ipfs.io/ipfs/',
  // 'https://dweb.link/ipfs/',
  // 'https://cf-ipfs.com/ipfs/',
  // 'https://gateway.ipfs.io/ipfs/',
];

export const fromIpfsProtocolToUrl = (ipfs: string, ipfsGatewayIndex: number = 0) => {
  return ipfsGateways[ipfsGatewayIndex] + ipfs.substring(7);
};
export const fromIpfsIdToUrl = (ipfs: string, ipfsGatewayIndex: number = 0) => {
  return ipfsGateways[ipfsGatewayIndex] + ipfs;
};
export const fetchJson = (url: string) => fetch(url).then(response => {
  if (response.status !== 200) {
    throw new Error("Unsuccessful");
  }
  return response.json()
});
export const fetchArrayBuffer = (url: string) => fetch(url).then(response => {
  if (response.status !== 200) {
    throw new Error("Unsuccessful");
  }
  response.arrayBuffer()
});

export const getNftierUrl = (nftierPath: string, sn: number) => `https://nftier.tech/hedera/${nftierPath}/${sn}`;

const tokenInfo = new Map<string, TokenInfo>();
const getTokenInfo = async (tokenId: string) => {
  if (!tokenInfo.has(tokenId)) {
    const promise = await client.getTokenById(tokenId, undefined).then(response => response.result);
    tokenInfo.set(tokenId, promise);
  }
  
  return tokenInfo.get(tokenId)!;
}

export const executeWithRetriesAsync = async <T>(func: (retryNum: number) => Promise<T>, shouldRetry: (err: any) => boolean, maxRetries = 5): Promise<T> => {
  let retryNum = 0;
  while (maxRetries > 0) {
    maxRetries--;
    try {
      return await func(retryNum);
    } catch (err: any) {
      if (maxRetries <= 0 || !shouldRetry(err)) {
        throw err;
      }
      retryNum++;
    }
  }

  throw new Error("Reached maximum retries and did not rethrow error... Should not have gotten here.");
};

export const getMetadataObj = async (metadata: string) => {
  let metadataIpfs = decodeBase64(metadata);

  if (!metadataIpfs || metadataIpfs.length <= 20) {
    throw new Error("NFT Metadata is invalid");
  }

  if (!metadataIpfs.startsWith('ipfs://') && !metadataIpfs.startsWith('https://')) {
    metadataIpfs = `ipfs://${metadataIpfs}`;
  }

  const metadataObj = await new BPromise<{
    name?: string,
    image?: string,
    CID?: string,
  }>(resolve => executeWithRetriesAsync(async (retry) => {
    let metadataUrl = metadataIpfs;
    if (!metadataIpfs.startsWith('https://')) {
      metadataUrl = fromIpfsProtocolToUrl(metadataIpfs, retry % ipfsGateways.length);
    }
    const json = await fetchJson(metadataUrl);
    resolve(json);
  }, () => true)).timeout(10_000, 'Error, request timeout. IPFS data could not be loaded');

  return metadataObj;
}

export const listAccounts = async (idGt: number | undefined, idLt: number | undefined, limit: number = 100) => {
  const params = new URLSearchParams();
  if (idGt) {
    params.append("account.id", `gte:0.0.${idGt}`);
  }
  if (idLt) {
    params.append("account.id", `lt:0.0.${idLt}`);
  }
  if (limit) {
    params.append("limit", `${limit}`);
  }
  const response = await fetch(`${client.baseUrl}/api/v1/accounts?${params.toString()}`);
  const processedResponse = await client.processListAccounts(response);
  return processedResponse.result;
}

export const getAccount = async (id: number) => {
  const params = new URLSearchParams();
  if (id) {
    params.append("account.id", `eq:0.0.${id}`);
  }
  const response = await fetch(`${client.baseUrl}/api/v1/accounts?${params.toString()}`);
  const processedResponse = await client.processListAccounts(response);
  return processedResponse.result;
}

export const getMostRecentNFTs = async (limit: number = 100) => {
  const response = await client.listTokens(undefined, undefined, ["NON_FUNGIBLE_UNIQUE"], limit, undefined, Order.Desc);
  return response.result;
}

export const listNftTokens = async (idGt: number | undefined, idLt: number | undefined, limit: number = 100) => {
  const params = new URLSearchParams();
  params.append("type", "NON_FUNGIBLE_UNIQUE")
  if (idGt) {
    params.append("token.id", `gt:0.0.${idGt}`);
  }
  if (idLt) {
    params.append("token.id", `lt:0.0.${idLt}`);
  }
  if (limit) {
    params.append("limit", `${limit}`);
  }
  const response = await fetch(`${client.baseUrl}/api/v1/tokens?${params.toString()}`);
  const processedResponse = await client.processListTokens(response);
  return processedResponse.result;
}

type ContinuableResponse<T> = SwaggerResponse<T & {
  links?: Links
}>;

const queryUntilEnd = async <T>(
  queryFunc: () => Promise<ContinuableResponse<T>>,
  processQueryFunc: (response: Response) => Promise<ContinuableResponse<T>>,
  maxRequests: number = 500
): Promise<T[]> => {
  const results = [];
  let response = await queryFunc();
  if (response.result) {
    results.push(response.result);
  }
  let requests = 0;
  while (requests < maxRequests && response.result.links?.next) {
    response = await processQueryFunc(await fetch(client.baseUrl + response.result.links.next));
    if (response.result) {
      results.push(response.result);
    }
    requests++;
  }
  return results;
}

export const listAllNfts = async (tokenId: string, maxRequests?: number) => {
  const queryFunc = () => client.listNfts(tokenId, undefined, 100, Order.Asc);
  const results = await queryUntilEnd(queryFunc, (res) => client.processListNfts(res), maxRequests);
  const nfts = results.map(o => o.nfts?.filter(o => !!o)).flat() as Nft[];
  return nfts;
}

export const listAllNftsForAccount = async (accountId: string, maxRequests?: number) => {
  const queryFunc = () => client.listNftByAccountId(accountId, undefined, undefined, undefined, 100, Order.Asc);
  const results = await queryUntilEnd(queryFunc, (res) => client.processListNftByAccountId(res), maxRequests);
  const nfts = results.map(o => o.nfts?.filter(o => !!o)).flat() as Nft[];
  return nfts;
}

export const getAccountFirstNft = async (
  accountId: string
) => {
  const nfts = await client.listNftByAccountId(accountId, undefined, undefined, undefined, 100, undefined);
  if (nfts.result.nfts && nfts.result.nfts.length > 0) {
    const firstNft = nfts.result.nfts[0];
    let metadataObj: any = null;
    if (firstNft.metadata) {
      metadataObj = await getMetadataObj(firstNft.metadata).catch(() => null);
    }

    const tokenInfo = await getTokenInfo(firstNft.token_id!);

    return {
      ...firstNft,
      metadataObj,
      tokenInfo,
    } as NftWithMetadata;
  }
  return null;
}

export const getFirstNft = async (
  tokenId: string,
) => {
  const response = await client.listNfts(tokenId, undefined, 100, Order.Asc);
  if (response.result.nfts && response.result.nfts.length > 0) {
    const nftInfo = response.result.nfts[0];
    let metadataObj: any = null;
    if (nftInfo.metadata) {
      metadataObj = await getMetadataObj(nftInfo.metadata).catch(() => null);
    }

    const tokenInfo = await getTokenInfo(nftInfo.token_id!);

    return {
      ...nftInfo,
      metadataObj,
      tokenInfo
    } as NftWithMetadata;
  }

  return null;
}

export const loadMetadataForNfts = async (
  nfts: Nft[],
  onChunkLoaded: (
    chunkLoaded: NftWithMetadata[],
    allNftsLoadedSoFar: NftWithMetadata[]
  ) => any
): Promise<NftWithMetadata[]> => {
  let allNfts: NftWithMetadata[] = [];
  if (nfts) {
    const nftsChunked = _.chunk(nfts, 100);
    for (let chunk of nftsChunked) {
      const nftMetadataPromises = chunk.map(async nftInfo => {
        const tokenInfo = await getTokenInfo(nftInfo.token_id!);
        if (nftInfo.metadata) {
          return getMetadataObj(nftInfo.metadata).then(o => ({
            ...nftInfo,
            metadataObj: o,
            tokenInfo,
          } as NftWithMetadata)).catch(err => ({
            ...nftInfo,
            metadataErrObj: err,
            tokenInfo,
          }));
        } else {
          return Promise.resolve(null);
        }
      });
      const nftMetadatas = await Promise.all(nftMetadataPromises);
      const nftMetadatasFiltered = nftMetadatas.filter(o => o !== null) as NftWithMetadata[];
      allNfts = [...allNfts, ...nftMetadatasFiltered];
      onChunkLoaded(nftMetadatasFiltered, allNfts);
    }
  }
  return allNfts;
}

export const listAllNftsWithMetadata = async (
  tokenId: string,
  maxRequests = 10,
  onChunkLoaded: (
    chunkLoaded: NftWithMetadata[],
    allNftsLoadedSoFar: NftWithMetadata[]
  ) => any
): Promise<NftWithMetadata[]> => {
  const nfts = await listAllNfts(tokenId, maxRequests);
  return await loadMetadataForNfts(nfts, onChunkLoaded);
}

export const listAllAccountNftsWithMetadata = async (
  accountId: string,
  maxRequests = 10,
  onChunkLoaded: (
    chunkLoaded: NftWithMetadata[],
    allNftsLoadedSoFar: NftWithMetadata[]
  ) => any
): Promise<NftWithMetadata[]> => {
  const nfts = await listAllNftsForAccount(accountId, maxRequests);
  return await loadMetadataForNfts(nfts, onChunkLoaded);
}

export const listTrans = async (onChunkLoaded: (
  chunkLoaded: Transaction[],
  allTransactionsLoadedSoFar: Transaction[]
) => any) => {
  let trans: Transaction[] = [];
  const params = new URLSearchParams();
  params.append("limit", `100`);
  params.append("timestamp", `gte:1654736400`);
  params.append("order", Order.Asc);
  for (const t of [TransactionTypes.TOKENCREATION, TransactionTypes.TOKENASSOCIATE, TransactionTypes.TOKENMINT, TransactionTypes.CRYPTOTRANSFER]) {
    params.delete("transactiontype")
    params.append("transactiontype", t);
    const response = await fetch(`${client.baseUrl}/api/v1/transactions?${params.toString()}`);
    let processedResponse = await client.processListTransactions(response);

    if (processedResponse.result.transactions) {
      trans.push(...processedResponse.result.transactions);
    }

    let skip = false;
    while (!skip && processedResponse.result.links?.next) {
      processedResponse = await client.processListTransactions(await fetch(client.baseUrl + processedResponse.result.links.next));
      if (processedResponse.result.transactions && processedResponse.result.transactions.length > 0) {
        trans = [...trans, ...processedResponse.result.transactions];
        let x = 0;
        const lastTrans = trans[trans.length - 1];
        if (lastTrans.valid_start_timestamp !== undefined) {
          x = Number.parseFloat(lastTrans.valid_start_timestamp);
        }
        const datetimestamp = new Date(x * 1000);
        console.log(datetimestamp);
        onChunkLoaded(processedResponse.result.transactions, trans);

        if (datetimestamp.getDate() >= 15) {
          skip = true;
        }
      }

      if (skip) {
        continue;
      }
    }
  }

  return trans;
}
