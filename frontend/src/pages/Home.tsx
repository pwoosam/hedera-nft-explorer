import { Stack, Box, Grid, Pagination, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Nft } from "../api-clients/hedera-mirror-node-api-client";
import { getFirstNft, getMostRecentNFTs, NftWithMetadata } from "../api-clients/hedera-mirror-node-api-helper";
import { NftSquare } from "../components/nfts/nft-square";

export const Home = () => {
  const [firstNftByTokenId, setFirstNftByTokenId] = useState<Map<string, Nft>>(new Map());
  const [nftTokens, setNftTokens] = useState<{ token_id: string, symbol: string, type: string }[]>([]);

  useEffect(() => {
    getMostRecentNFTs().then(response => {
      if (response.tokens) {
        setNftTokens(response.tokens as any);
      }
    });
  }, []);

  useEffect(() => {
    const map = new Map<string, Nft>();
    for (const nft of nftTokens) {
      if (!map.has(nft.token_id)) {
        getFirstNft(nft.token_id).then(val => {
          if (val) {
            map.set(nft.token_id, val);
          }
          setFirstNftByTokenId(new Map(map));
        });
      }
    }
  }, [nftTokens]);

  const nfts = useMemo(() => {
    return nftTokens.map(o => firstNftByTokenId.get(o.token_id)).filter(o => !!o) as NftWithMetadata[];
  }, [nftTokens, firstNftByTokenId]);

  const itemsPerPage = 12;
  const pages = Math.ceil(nfts.length / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = itemsPerPage * (currentPage - 1);
  const endIndex = startIndex + itemsPerPage;

  return (
    <Stack spacing={1}>
      <Typography
        variant="h2"
      >
        Newest NFTs
      </Typography>
      <Box>
        <Grid container spacing={1}>
          {nfts.slice(startIndex, endIndex).map((o) => {
            return (
              <Grid item xs={12} sm={6} md={4} lg={2} key={`${o.token_id}:${o.serial_number}`}>
                <NftSquare
                  tokenId={o.token_id!}
                  serialNumber={o.serial_number!}
                />
              </Grid>
            );
          })}
        </Grid>
      </Box>
      <Box>
        <Pagination
          count={pages}
          page={currentPage}
          color="primary"
          onChange={(_, page) => {
            setCurrentPage(page);
          }}
        />
      </Box>
    </Stack>
  );
}
