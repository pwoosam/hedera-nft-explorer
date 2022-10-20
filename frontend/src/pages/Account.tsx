import { Alert, Box, Grid, Pagination, Snackbar, Stack } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { listAllAccountNftsWithMetadata, NftWithMetadata } from "../api-clients/hedera-mirror-node-api-helper";
import { NftSquare } from "../components/nfts/nft-square";
import { actions } from "../store";

export const Account = () => {
  const [nfts, setNfts] = useState<NftWithMetadata[]>([]);
  const [err, setErr] = useState('');
  const dispatch = useDispatch();

  const params = useParams<{ id?: string }>();
  const id = params.id ? params.id : "0.0.994239";
  const idRef = useRef(id);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    setNfts([]);
    dispatch(actions.page.setIsLoading(true));
    listAllAccountNftsWithMetadata(id, Infinity, (_, allNfts) => {
      if (idRef.current === id) {
        setNfts(allNfts);
      }
    }).then((allNfts) => {
      if (allNfts.length === 0) {
        setErr(`Could not find NFTs for account id: ${id}`)
      }
    }).catch(err => {
      if (idRef.current === id) {
        setErr(typeof err === 'string' ? err : JSON.stringify(err));
      }
    }).finally(() => {
      if (idRef.current === id) {
        dispatch(actions.page.setIsLoading(false));
      }
    });
  }, [id, idRef, dispatch]);

  const itemsPerPage = 12;
  const pages = Math.ceil(nfts.length / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = itemsPerPage * (currentPage - 1);
  const endIndex = startIndex + itemsPerPage;

  return (
    <Stack spacing={1}>
      <Snackbar
        open={err !== ''}
        onClose={() => setErr('')}
      >
        <Alert
          severity="error"
          onClose={() => setErr('')}
        >
          {err}
        </Alert>
      </Snackbar>
      <Box>
        <Grid container spacing={1}>
          {nfts.slice(startIndex, endIndex).map((o) => {
            return (
              <Grid item xs={12} sm={6} md={4} lg={2} key={`${o.token_id}:${o.serial_number}`}>
                <NftSquare nft={o} />
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