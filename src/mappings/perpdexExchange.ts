import {
  Deposited,
  Withdrawn,
  ProtocolFeeTransferred,
  LiquidityAddedExchange,
  LiquidityRemovedExchange,
  PositionLiquidated,
  PositionChanged,
  MaxMarketsPerAccountChanged,
  ImRatioChanged,
  MmRatioChanged,
  LiquidationRewardConfigChanged,
  ProtocolFeeRatioChanged,
  IsMarketAllowedChanged,
  createNewMarketDatasource,
} from '../types';
import { FrontierEvmEvent } from '@subql/contract-processors/dist/frontierEvm';
import { BigNumber } from 'ethers';
import {
  getOrCreateTrader,
  getOrCreateProtocol,
  getOrCreateTraderTakerInfo,
  getOrCreateTraderMakerInfo,
  getOrCreatePosition,
  getOrCreateOpenOrder,
  getOrCreateMarket,
  getOrCreateCandle,
  createPositionHistory,
  createLiquidityHistory,
  getOrCreateDaySummary,
} from '../utils/store';
import { negBI } from '../utils/math';

type DepositedArgs = [string, BigNumber] & { trader: string; amount: BigNumber };
type WithdrawnArgs = [string, BigNumber] & { trader: string; amount: BigNumber };
type ProtocolFeeTransferredArgs = [string, BigNumber] & { trader: string; amount: BigNumber };
type LiquidityAddedExchangeArgs = [
  string,
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber
] & {
  trader: string;
  market: string;
  base: BigNumber;
  quote: BigNumber;
  liquidity: BigNumber;
  cumBasePerLiquidityX96: BigNumber;
  cumQuotePerLiquidityX96: BigNumber;
  baseBalancePerShareX96: BigNumber;
  sharePriceAfterX96: BigNumber;
};
type LiquidityRemovedExchangeArgs = [
  string,
  string,
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber
] & {
  trader: string;
  market: string;
  liquidator: string;
  base: BigNumber;
  quote: BigNumber;
  liquidity: BigNumber;
  takerBase: BigNumber;
  takerQuote: BigNumber;
  realizedPnl: BigNumber;
  baseBalancePerShareX96: BigNumber;
  sharePriceAfterX96: BigNumber;
};
type PositionLiquidatedArgs = [
  string,
  string,
  string,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber
] & {
  trader: string;
  market: string;
  liquidator: string;
  base: BigNumber;
  quote: BigNumber;
  realizedPnl: BigNumber;
  protocolFee: BigNumber;
  baseBalancePerShareX96: BigNumber;
  sharePriceAfterX96: BigNumber;
  liquidationPenalty: BigNumber;
  liquidationReward: BigNumber;
  insuranceFundReward: BigNumber;
};
type PositionChangedArgs = [string, string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber] & {
  trader: string;
  market: string;
  base: BigNumber;
  quote: BigNumber;
  realizedPnl: BigNumber;
  protocolFee: BigNumber;
  baseBalancePerShareX96: BigNumber;
  sharePriceAfterX96: BigNumber;
};
type MaxMarketsPerAccountChangedArgs = [number] & {
  value: number;
};
type ImRatioChangedArgs = [number] & {
  value: number;
};
type MmRatioChangedArgs = [number] & {
  value: number;
};
type LiquidationRewardConfigChangedArgs = [number, number] & {
  rewardRatio: number;
  smoothEmaTime: number;
};
type ProtocolFeeRatioChangedArgs = [number] & {
  value: number;
};
type IsMarketAllowedChangedArgs = [string, boolean] & {
  market: string;
  isMarketAllowed: boolean;
};

export async function handleDeposited(event: FrontierEvmEvent<DepositedArgs>): Promise<void> {
  const deposited = new Deposited(`${event.transactionHash}-${event.logIndex.toString()}`);
  deposited.txHash = event.transactionHash;
  deposited.trader = event.args.trader;
  deposited.amount = event.args.amount.toBigInt();
  deposited.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  deposited.blockNumber = BigInt(event.blockNumber);
  deposited.timestamp = BigInt(event.blockTimestamp.getTime());

  const trader = await getOrCreateTrader(event.args.trader);
  trader.collateralBalance = trader.collateralBalance + deposited.amount;
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await deposited.save();
  await trader.save();
  await protocol.save();
}

export async function handleWithdrawn(event: FrontierEvmEvent<WithdrawnArgs>): Promise<void> {
  const withdrawn = new Withdrawn(`${event.transactionHash}-${event.logIndex.toString()}`);
  withdrawn.txHash = event.transactionHash;
  withdrawn.trader = event.args.trader;
  withdrawn.amount = event.args.amount.toBigInt();
  withdrawn.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  withdrawn.blockNumber = BigInt(event.blockNumber);
  withdrawn.timestamp = BigInt(event.blockTimestamp.getTime());

  const trader = await getOrCreateTrader(event.args.trader);
  trader.collateralBalance = trader.collateralBalance - withdrawn.amount;
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await withdrawn.save();
  await trader.save();
  await protocol.save();
}

export async function handleProtocolFeeTransferred(event: FrontierEvmEvent<ProtocolFeeTransferredArgs>): Promise<void> {
  const protocolFeeTransferred = new ProtocolFeeTransferred(`${event.transactionHash}-${event.logIndex.toString()}`);
  protocolFeeTransferred.txHash = event.transactionHash;
  protocolFeeTransferred.trader = event.args.trader;
  protocolFeeTransferred.amount = event.args.amount.toBigInt();
  protocolFeeTransferred.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  protocolFeeTransferred.blockNumber = BigInt(event.blockNumber);
  protocolFeeTransferred.timestamp = BigInt(event.blockTimestamp.getTime());

  const trader = await getOrCreateTrader(event.args.trader);
  trader.collateralBalance = trader.collateralBalance + protocolFeeTransferred.amount;
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.protocolFee = protocol.protocolFee - protocolFeeTransferred.amount;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await protocolFeeTransferred.save();
  await trader.save();
  await protocol.save();
}

export async function handleLiquidityAddedExchange(event: FrontierEvmEvent<LiquidityAddedExchangeArgs>): Promise<void> {
  const liquidityAddedExchange = new LiquidityAddedExchange(`${event.transactionHash}-${event.logIndex.toString()}`);
  liquidityAddedExchange.txHash = event.transactionHash;
  liquidityAddedExchange.trader = event.args.trader;
  liquidityAddedExchange.market = event.args.market;
  liquidityAddedExchange.base = event.args.base.toBigInt();
  liquidityAddedExchange.quote = event.args.quote.toBigInt();
  liquidityAddedExchange.liquidity = event.args.liquidity.toBigInt();
  liquidityAddedExchange.cumBasePerLiquidityX96 = event.args.cumBasePerLiquidityX96.toBigInt();
  liquidityAddedExchange.cumQuotePerLiquidityX96 = event.args.cumQuotePerLiquidityX96.toBigInt();
  liquidityAddedExchange.baseBalancePerShareX96 = event.args.baseBalancePerShareX96.toBigInt();
  liquidityAddedExchange.sharePriceAfterX96 = event.args.sharePriceAfterX96.toBigInt();
  liquidityAddedExchange.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  liquidityAddedExchange.blockNumber = BigInt(event.blockNumber);
  liquidityAddedExchange.timestamp = BigInt(event.blockTimestamp.getTime());

  const trader = await getOrCreateTrader(liquidityAddedExchange.trader);
  trader.markets.push(liquidityAddedExchange.market);
  trader.markets = [...new Set(trader.markets)]; // duplicate deletion
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const market = await getOrCreateMarket(liquidityAddedExchange.market);
  market.baseBalancePerShareX96 = liquidityAddedExchange.baseBalancePerShareX96;
  market.sharePriceAfterX96 = liquidityAddedExchange.sharePriceAfterX96;
  market.blockNumber = BigInt(event.blockNumber);
  market.timestamp = BigInt(event.blockTimestamp.getTime());

  const traderMakerInfo = await getOrCreateTraderMakerInfo(
    liquidityAddedExchange.trader,
    liquidityAddedExchange.market
  );
  traderMakerInfo.liquidity = traderMakerInfo.liquidity + liquidityAddedExchange.liquidity;
  traderMakerInfo.cumBaseSharePerLiquidityX96 = liquidityAddedExchange.cumBasePerLiquidityX96;
  traderMakerInfo.cumQuotePerLiquidityX96 = liquidityAddedExchange.cumQuotePerLiquidityX96;
  traderMakerInfo.blockNumber = BigInt(event.blockNumber);
  traderMakerInfo.timestamp = BigInt(event.blockTimestamp.getTime());

  await createLiquidityHistory(
    liquidityAddedExchange.trader,
    liquidityAddedExchange.market,
    event.blockTimestamp,
    liquidityAddedExchange.base,
    liquidityAddedExchange.quote,
    liquidityAddedExchange.liquidity,
    liquidityAddedExchange.blockNumber
  );

  await getOrCreateCandle(
    liquidityAddedExchange.market,
    event.blockTimestamp,
    liquidityAddedExchange.sharePriceAfterX96,
    liquidityAddedExchange.blockNumber
  );

  await liquidityAddedExchange.save();
  await trader.save();
  await market.save();
  await traderMakerInfo.save();
}

export async function handleLiquidityRemovedExchange(
  event: FrontierEvmEvent<LiquidityRemovedExchangeArgs>
): Promise<void> {
  const liquidityRemovedExchange = new LiquidityRemovedExchange(
    `${event.transactionHash}-${event.logIndex.toString()}`
  );
  liquidityRemovedExchange.txHash = event.transactionHash;
  liquidityRemovedExchange.trader = event.args.trader;
  liquidityRemovedExchange.market = event.args.market;
  liquidityRemovedExchange.liquidator = event.args.liquidator;
  liquidityRemovedExchange.base = event.args.base.toBigInt();
  liquidityRemovedExchange.quote = event.args.quote.toBigInt();
  liquidityRemovedExchange.liquidity = event.args.liquidity.toBigInt();
  liquidityRemovedExchange.takerBase = event.args.takerBase.toBigInt();
  liquidityRemovedExchange.takerQuote = event.args.takerQuote.toBigInt();
  liquidityRemovedExchange.realizedPnl = event.args.realizedPnl.toBigInt();
  liquidityRemovedExchange.baseBalancePerShareX96 = event.args.baseBalancePerShareX96.toBigInt();
  liquidityRemovedExchange.sharePriceAfterX96 = event.args.sharePriceAfterX96.toBigInt();
  liquidityRemovedExchange.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  liquidityRemovedExchange.blockNumber = BigInt(event.blockNumber);
  liquidityRemovedExchange.timestamp = BigInt(event.blockTimestamp.getTime());

  const trader = await getOrCreateTrader(liquidityRemovedExchange.trader);
  trader.markets.push(liquidityRemovedExchange.market);
  trader.markets = [...new Set(trader.markets)]; // duplicate deletion
  trader.collateralBalance = trader.collateralBalance + liquidityRemovedExchange.realizedPnl;
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const market = await getOrCreateMarket(liquidityRemovedExchange.market);
  market.baseBalancePerShareX96 = liquidityRemovedExchange.baseBalancePerShareX96;
  market.sharePriceAfterX96 = liquidityRemovedExchange.sharePriceAfterX96;
  market.blockNumber = BigInt(event.blockNumber);
  market.timestamp = BigInt(event.blockTimestamp.getTime());

  const traderTakerInfo = await getOrCreateTraderTakerInfo(
    liquidityRemovedExchange.trader,
    liquidityRemovedExchange.market
  );
  traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare + liquidityRemovedExchange.takerBase;
  traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare * liquidityRemovedExchange.baseBalancePerShareX96;
  traderTakerInfo.quoteBalance =
    traderTakerInfo.quoteBalance + liquidityRemovedExchange.takerQuote - liquidityRemovedExchange.realizedPnl;
  traderTakerInfo.blockNumber = BigInt(event.blockNumber);
  traderTakerInfo.timestamp = BigInt(event.blockTimestamp.getTime());

  const traderMakerInfo = await getOrCreateTraderMakerInfo(
    liquidityRemovedExchange.trader,
    liquidityRemovedExchange.market
  );
  traderMakerInfo.liquidity = traderMakerInfo.liquidity - liquidityRemovedExchange.liquidity;
  traderMakerInfo.blockNumber = BigInt(event.blockNumber);
  traderMakerInfo.timestamp = BigInt(event.blockTimestamp.getTime());

  const daySummary = await getOrCreateDaySummary(event.args.trader, event.blockTimestamp);
  daySummary.realizedPnl = daySummary.realizedPnl + liquidityRemovedExchange.realizedPnl;
  daySummary.blockNumber = BigInt(event.blockNumber);
  daySummary.timestamp = BigInt(event.blockTimestamp.getTime());

  await createLiquidityHistory(
    liquidityRemovedExchange.trader,
    liquidityRemovedExchange.market,
    event.blockTimestamp,
    negBI(liquidityRemovedExchange.base),
    negBI(liquidityRemovedExchange.quote),
    negBI(liquidityRemovedExchange.liquidity),
    liquidityRemovedExchange.blockNumber
  );

  await getOrCreateCandle(
    liquidityRemovedExchange.market,
    event.blockTimestamp,
    liquidityRemovedExchange.sharePriceAfterX96,
    liquidityRemovedExchange.blockNumber
  );

  await liquidityRemovedExchange.save();
  await trader.save();
  await market.save();
  await traderTakerInfo.save();
  await traderMakerInfo.save();
  await daySummary.save();
}

export async function handlePositionLiquidated(event: FrontierEvmEvent<PositionLiquidatedArgs>): Promise<void> {
  const positionLiquidated = new PositionLiquidated(`${event.transactionHash}-${event.logIndex.toString()}`);
  positionLiquidated.txHash = event.transactionHash;
  positionLiquidated.trader = event.args.trader;
  positionLiquidated.market = event.args.market;
  positionLiquidated.liquidator = event.args.liquidator;
  positionLiquidated.base = event.args.base.toBigInt();
  positionLiquidated.quote = event.args.quote.toBigInt();
  positionLiquidated.realizedPnl = event.args.realizedPnl.toBigInt();
  positionLiquidated.protocolFee = event.args.protocolFee.toBigInt();
  positionLiquidated.baseBalancePerShareX96 = event.args.baseBalancePerShareX96.toBigInt();
  positionLiquidated.sharePriceAfterX96 = event.args.sharePriceAfterX96.toBigInt();
  positionLiquidated.liquidationPenalty = event.args.liquidationPenalty.toBigInt();
  positionLiquidated.insuranceFundReward = event.args.insuranceFundReward.toBigInt();
  positionLiquidated.liquidationReward = event.args.liquidationReward.toBigInt();
  positionLiquidated.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  positionLiquidated.blockNumber = BigInt(event.blockNumber);
  positionLiquidated.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.protocolFee = protocol.protocolFee + event.args.protocolFee.toBigInt();
  protocol.insuranceFundBalance = protocol.insuranceFundBalance + event.args.insuranceFundReward.toBigInt();
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  const trader = await getOrCreateTrader(event.args.trader);
  trader.markets.push(positionLiquidated.market);
  trader.markets = [...new Set(trader.markets)]; // duplicate deletion
  trader.collateralBalance =
    trader.collateralBalance + event.args.realizedPnl.toBigInt() - positionLiquidated.liquidationPenalty;
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const liquidator = await getOrCreateTrader(event.args.liquidator);
  liquidator.markets.push(positionLiquidated.market);
  liquidator.markets = [...new Set(liquidator.markets)]; // duplicate deletion
  liquidator.collateralBalance = liquidator.collateralBalance + event.args.liquidationReward.toBigInt();
  liquidator.blockNumber = BigInt(event.blockNumber);
  liquidator.timestamp = BigInt(event.blockTimestamp.getTime());

  const position = await getOrCreatePosition(event.args.trader, event.args.market);
  position.baseShare = position.baseShare + event.args.base.toBigInt();
  position.baseBalance = position.baseShare * event.args.baseBalancePerShareX96.toBigInt();
  position.openNotional = position.openNotional + event.args.quote.toBigInt() - event.args.realizedPnl.toBigInt();
  position.entryPrice = position.openNotional / position.baseBalance;
  position.blockNumber = BigInt(event.blockNumber);
  position.timestamp = BigInt(event.blockTimestamp.getTime());

  const traderTakerInfo = await getOrCreateTraderTakerInfo(event.args.trader, event.args.market);
  traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare + event.args.base.toBigInt();
  traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare * event.args.baseBalancePerShareX96.toBigInt();
  traderTakerInfo.quoteBalance =
    traderTakerInfo.quoteBalance + event.args.quote.toBigInt() - event.args.realizedPnl.toBigInt();
  traderTakerInfo.blockNumber = BigInt(event.blockNumber);
  traderTakerInfo.timestamp = BigInt(event.blockTimestamp.getTime());

  const daySummary = await getOrCreateDaySummary(event.args.trader, event.blockTimestamp);
  daySummary.realizedPnl = daySummary.realizedPnl + positionLiquidated.realizedPnl;
  daySummary.blockNumber = BigInt(event.blockNumber);
  daySummary.timestamp = BigInt(event.blockTimestamp.getTime());

  await getOrCreateCandle(
    event.args.market,
    event.blockTimestamp,
    event.args.sharePriceAfterX96.toBigInt(),
    BigInt(event.blockNumber)
  );

  await positionLiquidated.save();
  await protocol.save();
  await trader.save();
  await liquidator.save();
  await position.save();
  await traderTakerInfo.save();
  await daySummary.save();
}

export async function handlePositionChanged(event: FrontierEvmEvent<PositionChangedArgs>): Promise<void> {
  const positionChanged = new PositionChanged(`${event.transactionHash}-${event.logIndex.toString()}`);
  positionChanged.txHash = event.transactionHash;
  positionChanged.trader = event.args.trader;
  positionChanged.market = event.args.market;
  positionChanged.base = event.args.base.toBigInt();
  positionChanged.quote = event.args.quote.toBigInt();
  positionChanged.realizedPnl = event.args.realizedPnl.toBigInt();
  positionChanged.protocolFee = event.args.protocolFee.toBigInt();
  positionChanged.baseBalancePerShareX96 = event.args.baseBalancePerShareX96.toBigInt();
  positionChanged.sharePriceAfterX96 = event.args.sharePriceAfterX96.toBigInt();
  positionChanged.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  positionChanged.blockNumber = BigInt(event.blockNumber);
  positionChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  await createPositionHistory(
    positionChanged.trader,
    positionChanged.market,
    event.blockTimestamp,
    positionChanged.base,
    positionChanged.quote,
    positionChanged.realizedPnl,
    positionChanged.protocolFee,
    positionChanged.blockNumber
  );

  const trader = await getOrCreateTrader(positionChanged.trader);
  trader.markets.push(positionChanged.market);
  trader.markets = [...new Set(trader.markets)]; // duplicate deletion
  trader.collateralBalance = trader.collateralBalance + positionChanged.realizedPnl;
  trader.blockNumber = BigInt(event.blockNumber);
  trader.timestamp = BigInt(event.blockTimestamp.getTime());

  const market = await getOrCreateMarket(positionChanged.market);
  market.baseBalancePerShareX96 = positionChanged.baseBalancePerShareX96;
  market.sharePriceAfterX96 = positionChanged.sharePriceAfterX96;
  market.blockNumber = BigInt(event.blockNumber);
  market.timestamp = BigInt(event.blockTimestamp.getTime());

  const traderTakerInfo = await getOrCreateTraderTakerInfo(positionChanged.trader, positionChanged.market);
  traderTakerInfo.baseBalanceShare = traderTakerInfo.baseBalanceShare + positionChanged.base;
  traderTakerInfo.baseBalance = traderTakerInfo.baseBalanceShare * positionChanged.baseBalancePerShareX96;
  traderTakerInfo.quoteBalance = traderTakerInfo.quoteBalance + positionChanged.quote - positionChanged.realizedPnl; // quoteFee=0
  traderTakerInfo.blockNumber = BigInt(event.blockNumber);
  traderTakerInfo.timestamp = BigInt(event.blockTimestamp.getTime());

  const position = await getOrCreatePosition(positionChanged.trader, positionChanged.market);
  position.baseShare = position.baseShare + positionChanged.base;
  position.baseBalance = position.baseShare * positionChanged.baseBalancePerShareX96;
  position.openNotional = position.openNotional + positionChanged.quote - positionChanged.realizedPnl; // quoteFee=0
  position.entryPrice = position.openNotional / position.baseBalance;
  position.traderTakerInfoRefId = traderTakerInfo.id;
  position.marketRefId = positionChanged.market;
  position.blockNumber = BigInt(event.blockNumber);
  position.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.protocolFee = protocol.protocolFee + positionChanged.protocolFee;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  const daySummary = await getOrCreateDaySummary(event.args.trader, event.blockTimestamp);
  daySummary.realizedPnl = daySummary.realizedPnl + positionChanged.realizedPnl;
  daySummary.blockNumber = BigInt(event.blockNumber);
  daySummary.timestamp = BigInt(event.blockTimestamp.getTime());

  await getOrCreateCandle(
    positionChanged.market,
    event.blockTimestamp,
    positionChanged.sharePriceAfterX96,
    positionChanged.blockNumber
  );

  await positionChanged.save();
  await trader.save();
  await market.save();
  await traderTakerInfo.save();
  await position.save();
  await protocol.save();
  await daySummary.save();
}

export async function handleMaxMarketsPerAccountChanged(
  event: FrontierEvmEvent<MaxMarketsPerAccountChangedArgs>
): Promise<void> {
  const maxMarketsPerAccountChanged = new MaxMarketsPerAccountChanged(
    `${event.transactionHash}-${event.logIndex.toString()}`
  );
  maxMarketsPerAccountChanged.txHash = event.transactionHash;
  maxMarketsPerAccountChanged.value = event.args.value;
  maxMarketsPerAccountChanged.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  maxMarketsPerAccountChanged.blockNumber = BigInt(event.blockNumber);
  maxMarketsPerAccountChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.maxMarketsPerAccount = maxMarketsPerAccountChanged.value;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await maxMarketsPerAccountChanged.save();
  await protocol.save();
}

export async function handleImRatioChanged(event: FrontierEvmEvent<ImRatioChangedArgs>): Promise<void> {
  const imRatioChanged = new ImRatioChanged(`${event.transactionHash}-${event.logIndex.toString()}`);
  imRatioChanged.txHash = event.transactionHash;
  imRatioChanged.value = event.args.value;
  imRatioChanged.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  imRatioChanged.blockNumber = BigInt(event.blockNumber);
  imRatioChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.imRatio = imRatioChanged.value;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await imRatioChanged.save();
  await protocol.save();
}

export async function handleMmRatioChanged(event: FrontierEvmEvent<MmRatioChangedArgs>): Promise<void> {
  const mmRatioChanged = new MmRatioChanged(`${event.transactionHash}-${event.logIndex.toString()}`);
  mmRatioChanged.txHash = event.transactionHash;
  mmRatioChanged.value = event.args.value;
  mmRatioChanged.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  mmRatioChanged.blockNumber = BigInt(event.blockNumber);
  mmRatioChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.mmRatio = mmRatioChanged.value;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await mmRatioChanged.save();
  await protocol.save();
}

export async function handleLiquidationRewardConfigChanged(
  event: FrontierEvmEvent<LiquidationRewardConfigChangedArgs>
): Promise<void> {
  const liquidationRewardConfigChanged = new LiquidationRewardConfigChanged(
    `${event.transactionHash}-${event.logIndex.toString()}`
  );
  liquidationRewardConfigChanged.txHash = event.transactionHash;
  liquidationRewardConfigChanged.rewardRatio = event.args.rewardRatio;
  liquidationRewardConfigChanged.smoothEmaTime = event.args.smoothEmaTime;
  liquidationRewardConfigChanged.blockNumberLogIndex =
    BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  liquidationRewardConfigChanged.blockNumber = BigInt(event.blockNumber);
  liquidationRewardConfigChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.rewardRatio = liquidationRewardConfigChanged.rewardRatio;
  protocol.smoothEmaTime = liquidationRewardConfigChanged.smoothEmaTime;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await liquidationRewardConfigChanged.save();
  await protocol.save();
}

export async function handleProtocolFeeRatioChanged(
  event: FrontierEvmEvent<ProtocolFeeRatioChangedArgs>
): Promise<void> {
  const protocolFeeRatioChanged = new ProtocolFeeRatioChanged(`${event.transactionHash}-${event.logIndex.toString()}`);
  protocolFeeRatioChanged.txHash = event.transactionHash;
  protocolFeeRatioChanged.value = event.args.value;
  protocolFeeRatioChanged.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  protocolFeeRatioChanged.blockNumber = BigInt(event.blockNumber);
  protocolFeeRatioChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  const protocol = await getOrCreateProtocol();
  protocol.protocolFeeRatio = protocolFeeRatioChanged.value;
  protocol.blockNumber = BigInt(event.blockNumber);
  protocol.timestamp = BigInt(event.blockTimestamp.getTime());

  await protocolFeeRatioChanged.save();
  await protocol.save();
}

export async function handleIsMarketAllowedChanged(event: FrontierEvmEvent<IsMarketAllowedChangedArgs>): Promise<void> {
  const isMarketAllowedChanged = new IsMarketAllowedChanged(`${event.transactionHash}-${event.logIndex.toString()}`);
  isMarketAllowedChanged.txHash = event.transactionHash;
  isMarketAllowedChanged.market = event.args.market;
  isMarketAllowedChanged.isMarketAllowed = event.args.isMarketAllowed;
  isMarketAllowedChanged.blockNumberLogIndex = BigInt(event.blockNumber) * BigInt(1000) + BigInt(event.logIndex);
  isMarketAllowedChanged.blockNumber = BigInt(event.blockNumber);
  isMarketAllowedChanged.timestamp = BigInt(event.blockTimestamp.getTime());

  const market = await getOrCreateMarket(event.args.market);
  market.blockNumber = BigInt(event.blockNumber);
  market.timestamp = BigInt(event.blockTimestamp.getTime());

  await createNewMarketDatasource({ address: event.args.market });
  await isMarketAllowedChanged.save();
  await market.save();
}
