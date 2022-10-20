import { Box, Button, Card, CardContent, CardHeader, Link, Chip, Popover, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { fromIpfsIdToUrl, fromIpfsProtocolToUrl, NftWithMetadata } from "../../api-clients/hedera-mirror-node-api-helper";
import { decodeBase64 } from "../../utils";
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import '@google/model-viewer';

const isVideoMetadata = (metadataObj?: { type?: string }) => {
  if (metadataObj?.type && typeof metadataObj.type === 'string') {
    return metadataObj.type.startsWith('video');
  }
  return false;
}

const getUrlFromImageMetadata = (metadataObj?: {
  image?: string | { type: string, description: string },
  type?: string,
  CID?: string,
}): string => {
  if (!metadataObj) {
    return '';
  }

  if (!metadataObj.image && !metadataObj.CID) {
    return '';
  }

  if (typeof metadataObj.image === 'object') {
    return getUrlFromImageMetadata({
      ...metadataObj,
      image: metadataObj.image.description,
    });
  }

  const isVideo = isVideoMetadata(metadataObj);

  let srcUrl = '';
  if (metadataObj.image) {
    if (metadataObj.image.startsWith("ipfs://")) {
      srcUrl = fromIpfsProtocolToUrl(metadataObj.image);
    } else if (metadataObj.image.startsWith("http")) {
      const url = new URL(metadataObj.image);
      let cid = '';
      if (url.pathname.startsWith('/ipfs')) {
        cid = url.pathname.replace('/ipfs/', '');
      } else {
        cid = url.hostname.split('.')[0];
      }
      srcUrl = fromIpfsIdToUrl(cid);
    } else if (metadataObj.image) {
      srcUrl = fromIpfsIdToUrl(metadataObj.image);
    }
  } else if (metadataObj.CID) {
    // This case handles early Hash Boos
    const cid = metadataObj.CID.replace('https://', '').split('.')[0];
    srcUrl = fromIpfsIdToUrl(cid);
  } else if (metadataObj.CID) {
    srcUrl = fromIpfsIdToUrl(metadataObj.CID);
  }

  if (!isVideo) {
    srcUrl += '?class=thumbnail';
  }

  return srcUrl;
}

export const NftSquare = (props: {
  nft: NftWithMetadata,
}) => {
  const serialNumberBadgeElm = useRef(null);
  const [showAttributes, setShowAttributes] = useState(false);

  const metadataBadgeElm = useRef(null);
  const [showMetadata, setShowMetadata] = useState(false);

  const [showMoreDescription, setShowMoreDescription] = useState(false);

  let metadataLoadingErrMessage: string | undefined;
  if (props.nft.metadataErrObj) {
    if (typeof props.nft.metadataErrObj.message === 'string') {
      metadataLoadingErrMessage = props.nft.metadataErrObj.message;
    } else {
      metadataLoadingErrMessage = JSON.stringify(props.nft.metadataErrObj, null, 2)
    }
  }

  const [imgTagErrored, setImgTagErrored] = useState(false);

  // clear imgTagErrored if new nft loaded
  useEffect(() => {
    setImgTagErrored(false);
  }, [props.nft]);

  const isVideo = useMemo(() => isVideoMetadata(props.nft.metadataObj) || imgTagErrored, [props.nft, imgTagErrored]);
  const srcUrl = useMemo(() => getUrlFromImageMetadata(props.nft.metadataObj), [props.nft]);

  const hasAnyKeys = !!props.nft.tokenInfo.admin_key ||
    !!props.nft.tokenInfo.freeze_key ||
    !!props.nft.tokenInfo.supply_key ||
    !!props.nft.tokenInfo.pause_key ||
    !!props.nft.tokenInfo.fee_schedule_key ||
    !!props.nft.tokenInfo.kyc_key ||
    !!props.nft.tokenInfo.wipe_key;

  const shortDescriptionLength = 120;
  let description = '';
  if (props.nft.metadataObj && props.nft.metadataObj.description) {
    const metadataDesc = props.nft.metadataObj.description;
    if (typeof metadataDesc === "string") {
      description = metadataDesc;
    } else if (metadataDesc.description) {
      description = metadataDesc.description;
    } else if (metadataDesc) {
      description = JSON.stringify(metadataDesc, null, 2);
    }
  }
  const isDescriptionLong = description.length > shortDescriptionLength;

  const cannotLoadImg = props.nft.tokenInfo.total_supply === "0" || srcUrl === "";

  return (
    <Card
      sx={{
        position: "relative",
        width: "100%",
      }}
    >
      <CardHeader
        title={`${props.nft.tokenInfo.name}`}
        subheader={`${props.nft.serial_number}/${props.nft.tokenInfo.total_supply}`}
      />
      {(metadataLoadingErrMessage || cannotLoadImg) ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="100%"
          height="100%"
        >
          <QuestionMarkIcon color="primary" fontSize="large" />
        </Box>
      ) : (isVideo ? (
        <video
          src={srcUrl}
          autoPlay
          playsInline
          loop
          muted
          className="img-responsive"
        ></video>
      ) : (
        srcUrl.includes('.glb') ? (
          <Box px={2}>.gbl not supported</Box>
          // <model-viewer
          //   alt={`NFT number ${props.nft.serial_number}`}
          //   src={srcUrl}
          //   className="img-responsive"
          //   autoplay
          // ></model-viewer>
        ) : (
          <img
            alt={`NFT number ${props.nft.serial_number}`}
            {...props}
            src={srcUrl}
            className="img-responsive"
            loading="lazy"
            onError={e => {
              setImgTagErrored(true);
            }}
          ></img>
        )
      ))}
      <CardContent
        sx={{
          lineHeight: 1,
        }}
      >
        <Typography
          variant="h6"
        >
          Owner
        </Typography>
        <Typography>
          <Link
            to={`/account/${props.nft.account_id}`}
            component={RouterLink}
          >
            {props.nft.account_id}
          </Link>
        </Typography>
        <Typography
          variant="h6"
        >
          Token
        </Typography>
        <Typography>
          <Link
            to={`/collection/${props.nft.token_id}`}
            component={RouterLink}
          >
            {props.nft.token_id}
          </Link>
        </Typography>
        {description && (
          <>
            <Typography
              variant="h6"
            >
              Description
            </Typography>
            <Typography
              variant="body2"
            >
              {showMoreDescription || !isDescriptionLong ? description : description.substring(0, shortDescriptionLength) + '...'}
            </Typography>

            {isDescriptionLong && (
              <Button
                type="button"
                variant="text"
                onClick={() => {
                  setShowMoreDescription(!showMoreDescription);
                }}
              >
                {showMoreDescription ? "Show less" : "Show more"}
              </Button>
            )}
          </>
        )}
        {hasAnyKeys && (
          <>
            <Typography
              variant="h6"
            >
              Keys
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {props.nft.tokenInfo.supply_key && <Chip title={`${props.nft.tokenInfo.supply_key.key}`} label="Supply" color="success" />}
              {props.nft.tokenInfo.wipe_key && <Chip title={`${props.nft.tokenInfo.wipe_key.key}`} label="Wipe" color="error" />}
              {props.nft.tokenInfo.admin_key && <Chip title={`${props.nft.tokenInfo.admin_key.key}`} label="Admin" color="warning" />}
              {props.nft.tokenInfo.freeze_key && <Chip title={`${props.nft.tokenInfo.freeze_key.key}`} label="Freeze" color="warning" />}
              {props.nft.tokenInfo.pause_key && <Chip title={`${props.nft.tokenInfo.pause_key.key}`} label="Pause" color="warning" />}
              {props.nft.tokenInfo.fee_schedule_key && <Chip title={`${props.nft.tokenInfo.fee_schedule_key.key}`} label="Fee Schedule" color="warning" />}
              {props.nft.tokenInfo.kyc_key && <Chip title={`${props.nft.tokenInfo.kyc_key.key}`} label="KYC" color="warning" />}
            </Box>
          </>
        )}

        <Typography
          variant="h6"
        >
          Actions
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {props.nft.metadataObj?.attributes && (
            <>
              <Chip
                label="Show Attributes"
                ref={serialNumberBadgeElm}
                onClick={() => {
                  setShowAttributes(!showAttributes)
                }}
                color="primary"
              />
              <Popover
                anchorEl={serialNumberBadgeElm.current}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                open={showAttributes}
                onClose={() => {
                  setShowAttributes(false);
                }}
              >
                {metadataLoadingErrMessage ? (
                  <Box p={1}>
                    {metadataLoadingErrMessage}
                  </Box>
                ) : (
                  <Box display="grid" gridTemplateColumns="1fr 2fr" gap={1} p={1}>
                    {props.nft.metadataObj?.attributes?.map?.((attr: {
                      trait_type: string,
                      value: string,
                    }) => (
                      <Fragment key={attr.trait_type}>
                        <Box>{attr.trait_type}</Box>
                        <Box>{attr.value}</Box>
                      </Fragment>
                    ))}
                  </Box>
                )}
              </Popover>
            </>
          )}

          <Chip
            label="Show Raw Metadata"
            ref={metadataBadgeElm}
            onClick={() => {
              setShowMetadata(!showMetadata)
            }}
            color="primary"
          />
          <Popover
            anchorEl={metadataBadgeElm.current}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            open={showMetadata}
            onClose={() => {
              setShowMetadata(false);
            }}
          >
            <Box
              px={1}
              maxWidth="70vw"
            >
              <pre className="pre-wrap">
                {props.nft?.metadata ? (
                  <>
                    {props.nft?.metadata}
                    <br />
                    <br />
                    {decodeBase64(props.nft?.metadata)}
                    <br />
                    <br />
                  </>
                ) : null}
                {metadataLoadingErrMessage ? (
                  metadataLoadingErrMessage
                ) : (
                  JSON.stringify(props.nft?.metadataObj, null, 2)
                )}
              </pre>
            </Box>
          </Popover>
        </Box>
      </CardContent>
    </Card>
  );
}
