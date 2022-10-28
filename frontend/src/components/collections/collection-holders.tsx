import { Box, Button, ButtonProps, Checkbox, FormControlLabel, Link, Modal, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Nft } from "../../api-clients/hedera-mirror-node-api-client";
import { DownloadCSV } from "../utilities/download-csv";

interface AccountNftCount {
  accountId: string,
  count: number,
  serialNumbers: number[],
};

const CollectionHoldersModal = (props: {
  tokenId: string,
  nfts: Nft[],
  open: boolean,
  onClose: () => any,
}) => {
  const {
    nfts,
    tokenId,
  } = props;
  const [nftOwners, setNftOwners] = useState<AccountNftCount[]>([]);
  const [includeListed, setIncludeListed] = useState(true);

  useEffect(() => {
    if (nfts) {
      (async () => {
        const owners = new Map<string, {
          count: number,
          serialNumbers: number[]
        }>();
        for (const nft of nfts) {
          if (!includeListed && nft.spender !== null) {
            continue;
          }

          const accId = nft.account_id!;
          if (accId) {
            if (owners.has(accId)) {
              const currInfo = owners.get(accId)!;
              currInfo.count++;
              currInfo.serialNumbers.push(nft.serial_number!);
              owners.set(accId, currInfo);
            } else {
              owners.set(accId, {
                count: 1,
                serialNumbers: [nft.serial_number!]
              });
            }
          }
        }

        const nftOwnershipCount = Array.from(owners).sort((a, b) => b[1].count - a[1].count).map(o => ({
          accountId: o[0],
          count: o[1].count,
          serialNumbers: o[1].serialNumbers,
        }));

        setNftOwners(nftOwnershipCount);
      })();
    }

    return () => setNftOwners([]);
  }, [nfts, includeListed])

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
    >
      <Box
        sx={{
          overflow: "scroll",
          maxHeight: "90vh",
          maxWidth: "90vw",
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          border: '2px solid #000',
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography
          variant="h6"
          textAlign="center"
        >
          NFT Hodlers
        </Typography>
        <Box
          display="flex"
          flexDirection="row"
          flexWrap="wrap"
        >
          <DownloadCSV
            data={nftOwners}
            filename={`${tokenId.split('.').pop()}_hodlers.csv`}
          />
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={includeListed}
              onChange={e => {
                setIncludeListed(e.target.checked);
              }}
            />
          }
          label="Include Listed NFTs"
        />
        <TableContainer component={Paper}>
          <Table aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell align="right">Account Id</TableCell>
                <TableCell align="right">#</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nftOwners.map(row => {
                return (
                  <TableRow
                    key={row.accountId}
                  >
                    <TableCell align="right">
                      <Link
                        to={`/account/${row.accountId}`}
                        component={RouterLink}
                      >
                        {row.accountId}
                      </Link>
                    </TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Modal>
  )
}

export const CollectionHoldersButton = (props: ButtonProps & {
  nfts: Nft[],
  tokenId: string,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        color="success"
        variant="contained"
        onClick={() => {
          setIsModalOpen(!isModalOpen);
        }}
        sx={props.sx}
      >
        NFT Hodlers
      </Button>

      <CollectionHoldersModal
        nfts={props.nfts}
        tokenId={props.tokenId}
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
      />
    </>
  )
}
