import './TokenSearchDialog.css';

import { TokenInfo } from '@uniswap/token-lists';
import classNames from 'classnames';
import Box from 'components/Box';
import DialogContainer from 'components/DialogContainer';
import IconButton from 'components/IconButton';
import Text from 'components/Text';
import useEthTokenList from 'hooks/use-eth-token-list';
import useGravityBridgeTokenList from 'hooks/use-gravity-bridge-token-list';
import closeIcon from 'images/close-icon.png';
import defaultTokenIcon from 'images/default-token-icon.png';
import { ReactComponent as WarnIcon } from 'images/warn-icon.svg';
import _ from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import ethWalletManager from 'services/eth-wallet-manager';
import { SupportedNetwork } from 'types';

type TokenSearchDialogProps = {
  open: boolean;
  fromNetwork: SupportedNetwork;
  ethChainId: string;
  gravityBridgeAccount?: string;
  className?: string;
  select: (tokenInfo: TokenInfo) => void;
  close: () => void;
}

const TokenSearcher: React.FC<TokenSearchDialogProps> = ({ open, fromNetwork, ethChainId, gravityBridgeAccount, className, select, close }) => {
  const [searchText, setSearchText] = useState<string>('');
  const [candidates, setCandidate] = useState<TokenInfo[]>([]);
  const ethTokenList = useEthTokenList(ethChainId);
  const gravityBridgeTokenList = useGravityBridgeTokenList(gravityBridgeAccount);

  useEffect(() => {
    setTimeout(() => {
      setCandidateByNetwork(fromNetwork, setCandidate, ethTokenList, gravityBridgeTokenList);
    }, 100);
  }, [setCandidate, fromNetwork, ethTokenList, gravityBridgeTokenList]);

  const onSearchTextChange = useCallback((event) => {
    const searchText = _.get(event, 'target.value', '');
    setSearchText(searchText);

    const tokenList = getCandidateByNetwork(fromNetwork, ethTokenList, gravityBridgeTokenList);
    if (_.isEmpty(searchText)) {
      setCandidateByNetwork(fromNetwork, setCandidate, ethTokenList, gravityBridgeTokenList);
    } else if (isEthAddress(searchText)) {
      findTokenInfo(tokenList, searchText)
        .then((tokenInfo) => { tokenInfo ? setCandidate([tokenInfo]) : setCandidate([]); })
        .catch(() => { setCandidate([]); });
    } else {
      const _candidates = filterTokenList(tokenList, searchText);
      setCandidate(_candidates);
    }
  }, [setSearchText, setCandidate, fromNetwork, ethTokenList, gravityBridgeTokenList]);

  const onTokenSelect = useCallback((tokenInfo: TokenInfo) => {
    select(tokenInfo);
    close();
  }, [select, close]);

  const onClose = useCallback(() => {
    setSearchText('');
    close();
  }, [close, setSearchText]);

  return (
    <DialogContainer open={open} close={onClose}>
      <Box className={classNames(className, 'TokenSearchDialog')}>
        <div className="token-searcher-heading">
          <Text size="medium">Select a Token</Text>
          <IconButton onClick={onClose}>
            <img src={closeIcon} alt="close"/>
          </IconButton>
        </div>
        <div className="token-search-input-container">
          <input
            className="token-search-input"
            autoComplete="false"
            placeholder="Search name or paste address"
            value={searchText}
            onChange={onSearchTextChange}
          />
        </div>
        {_.isEmpty(candidates)
          ? (<div className="no-token-candidate">
              <WarnIcon />
              &nbsp;&nbsp;
              <Text muted size="tiny">No result found</Text>
            </div>)
          : (<ul className="token-candidate-list">
            {_.map(candidates, (token, i) => (
              <li className="token-list-item" key={`${token.symbol}-${i}`} onClick={onTokenSelect.bind(null, token)}>
                <img src={token.logoURI ? token.logoURI : defaultTokenIcon} className="token-list-item-icon" alt={`${token.symbol} logo`}/>
                <div>
                  <Text size="small">{token.symbol}</Text>
                  <Text size="tiny" muted className="token-list-token-name">{token.name}</Text>
                </div>
              </li>
            ))}
          </ul>)}
      </Box>
    </DialogContainer>
  );
};

function isEthAddress (searchText: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(searchText);
}

async function findTokenInfo (tokenList: TokenInfo[], address: string): Promise<TokenInfo | undefined | null> {
  const tokenInfo = _.find(tokenList, (tokenInfo: TokenInfo) => tokenInfo.address === address);
  return tokenInfo || ethWalletManager.getERC20Info(address);
}

function filterTokenList (tokenList: TokenInfo[], searchText: string): TokenInfo[] {
  return _.filter(tokenList, (tokenInfo) => {
    const lowerValue = _.toLower(searchText);
    return _.includes(_.toLower(tokenInfo.name), lowerValue) ||
      _.includes(_.toLower(tokenInfo.symbol), lowerValue);
  });
}

function setCandidateByNetwork (
  network: SupportedNetwork,
  candidateSetter: (tokenInfos: TokenInfo[]) => void,
  ethTokenList: TokenInfo[],
  gravityBridgeTokenList: TokenInfo[]
): void {
  if (network === SupportedNetwork.Eth) {
    candidateSetter(ethTokenList);
  } else if (network === SupportedNetwork.GravityBridge) {
    candidateSetter(gravityBridgeTokenList);
  } else {
    candidateSetter([]);
  }
}

function getCandidateByNetwork (network: SupportedNetwork, ethTokenList: TokenInfo[], gravityBridgeTokenList: TokenInfo[]): TokenInfo[] {
  if (network === SupportedNetwork.Eth) {
    return ethTokenList;
  } else if (network === SupportedNetwork.GravityBridge) {
    return gravityBridgeTokenList;
  } else {
    return [];
  }
}

export default TokenSearcher;