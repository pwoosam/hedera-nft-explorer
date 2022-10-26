import { Alert, Box, Grid, Pagination, Snackbar, Stack } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { listAllNftsWithMetadata, NftWithMetadata } from "../api-clients/hedera-mirror-node-api-helper";
import { NftFilter } from "../components/nfts/nft-filter";
import { NftSquare } from "../components/nfts/nft-square";
import { actions } from "../store";

export const Collection = () => {
  const [properties, setProperties] = useState<Map<string, string[]>>(new Map());
  const [nfts, setNfts] = useState<NftWithMetadata[]>([]);
  const [err, setErr] = useState('');
  const [selectedAttributes, setSelectedAttributes] = useState<Map<string, string[]>>(new Map());
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
    listAllNftsWithMetadata(id, Infinity, (_, allNfts) => {
      if (idRef.current === id) {
        setNfts(allNfts);
      }
    }).then((allNfts) => {
      if (allNfts.length === 0) {
        setErr(`Could not find NFTs for token id: ${id}`)
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

  useEffect(() => {
    const propMap = new Map<string, string[]>();
    for (const nft of nfts) {
      if (nft?.metadataObj?.attributes) {
        for (const attribute of nft.metadataObj.attributes) {
          if (propMap.has(attribute.trait_type)) {
            const propValues = propMap.get(attribute.trait_type)!;
            if (!propValues.includes(attribute.value)) {
              propValues.push(attribute.value);
            }
          } else {
            propMap.set(attribute.trait_type, [attribute.value]);
          }
        }
      }
    }
    setProperties(propMap);
  }, [nfts]);

  const nftsFiltered = useMemo(() => {
    const anyFiltersSelected = Array.from(selectedAttributes).some(o => o[1].length > 0);

    const nftsFiltered = nfts.filter((o) => {
      let shouldShowNft = true;
      if (anyFiltersSelected) {
        for (const selectedAttribute of Array.from(selectedAttributes)) {
          const attributeTraitType = selectedAttribute[0];
          const attributeTraitValues = selectedAttribute[1];
          if (attributeTraitValues.length === 0) {
            continue;
          }

          const hasAttr = o.metadataObj?.attributes.some((attr: {
            trait_type: string,
            value: string,
          }) => attr.trait_type === attributeTraitType && attributeTraitValues.includes(attr.value));

          if (!hasAttr) {
            shouldShowNft = false;
            break;
          }
        }
      }
      return shouldShowNft;
    });

    return nftsFiltered;
  }, [nfts, selectedAttributes]);

  const itemsPerPage = 12;
  const pages = Math.ceil(nftsFiltered.length / itemsPerPage);
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
      <NftFilter properties={properties} onChange={filters => setSelectedAttributes(filters)}></NftFilter>
      <Box>
        <Grid container spacing={1}>
          {nftsFiltered.slice(startIndex, endIndex).map((o) => {
            return (
              <Grid item  xs={12} sm={6} md={4} lg={2} key={`${o.token_id}:${o.serial_number}`}>
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