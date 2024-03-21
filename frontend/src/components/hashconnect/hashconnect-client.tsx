import { HashConnect } from "hashconnect";
import { useMemo } from "react";
import { useDispatch } from "react-redux";
import { actions } from "../../store";
import { LedgerId, Transaction } from "@hashgraph/sdk";

export const hc = new HashConnect(LedgerId.MAINNET, "03182f28980fc53e57d43b0af01fc044", {
  name: "NFT Explorer",
  description: "A Hedera NFT Explorer by pwoosam",
  icons: [window.location.origin + "/logo192.png"],
  url: window.location.origin
});

export const hcInitPromise = new Promise(async (resolve) => {
  const initResult = await hc.init();
  resolve(initResult);
});

export const sendTransaction = async (trans: Transaction) => {
  const result = await hc.sendTransaction(hc.connectedAccountIds[0], trans as any);
  return result;
}

export const HashConnectClient = () => {
  const dispatch = useDispatch();
  const syncWithHashConnect = useMemo(() => {
    return () => {
      const accId = hc.connectedAccountIds[0];
      if (accId) {
        dispatch(actions.hashconnect.setAccountId(accId.toString()));
        dispatch(actions.hashconnect.setIsConnected(true));
      } else {
        dispatch(actions.hashconnect.setAccountId(''));
        dispatch(actions.hashconnect.setIsConnected(false));
      }
    };
  }, [dispatch]);

  syncWithHashConnect();
  hcInitPromise.then(() => {
    syncWithHashConnect();
  });
  hc.pairingEvent.on(() => {
    syncWithHashConnect();
  });
  hc.connectionStatusChangeEvent.on(() => {
    syncWithHashConnect();
  });
  return null;
};
