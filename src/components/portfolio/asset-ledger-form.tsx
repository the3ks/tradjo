"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createAssetLedgerAction,
  type PortfolioActionState
} from "@/app/(app)/portfolio/actions";

type CashPositionOption = {
  id: string;
  label: string;
};

const initialState: PortfolioActionState = {};

export function AssetLedgerForm({
  cashPositions
}: {
  cashPositions: CashPositionOption[];
}) {
  const [state, formAction] = useActionState(createAssetLedgerAction, initialState);
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementEdited, setSettlementEdited] = useState(false);
  const hasCashPositions = cashPositions.length > 0;

  function syncSettlement(nextQuantity: string, nextPrice: string) {
    if (settlementEdited) {
      return;
    }

    const numericQuantity = Number(nextQuantity);
    const numericPrice = Number(nextPrice);

    if (!Number.isFinite(numericQuantity) || !Number.isFinite(numericPrice)) {
      setSettlementAmount("");
      return;
    }

    setSettlementAmount((numericQuantity * numericPrice || 0).toString());
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Transaction
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="action"
            defaultValue="BUY"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Symbol
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="symbol"
            placeholder="BTC, TSLA"
            maxLength={24}
            required
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Asset class
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="assetClass"
            defaultValue="CRYPTO"
          >
            <option value="CRYPTO">Crypto</option>
            <option value="STOCK">Stock</option>
            <option value="FOREX">Forex</option>
            <option value="COMMODITY">Commodity</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Position type
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="positionType"
            defaultValue="SPOT"
          >
            <option value="SPOT">Spot</option>
            <option value="FUTURES">Futures</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Currency
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="currency"
            defaultValue="USDT"
            maxLength={16}
            required
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Quantity
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="quantity"
            min="0"
            onChange={(event) => {
              setQuantity(event.target.value);
              syncSettlement(event.target.value, price);
            }}
            step="any"
            type="number"
            value={quantity}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Price
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="price"
            min="0"
            onChange={(event) => {
              setPrice(event.target.value);
              syncSettlement(quantity, event.target.value);
            }}
            step="any"
            type="number"
            value={price}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Fee
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="feeAmount"
            min="0"
            step="any"
            type="number"
            defaultValue="0"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Date
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="transactionDate"
            type="datetime-local"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Exchange
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-foreground outline-none transition focus:border-accent"
            name="exchange"
            placeholder="General, BingX, Binance"
            maxLength={80}
          />
        </label>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            className="size-4 accent-[var(--accent)]"
            disabled={!hasCashPositions}
            name="settleWithCash"
            type="checkbox"
          />
          Settle with Portfolio Cash
        </label>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Cash source
            <select
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent disabled:opacity-70"
              disabled={!hasCashPositions}
              name="cashPositionId"
              defaultValue={cashPositions[0]?.id ?? ""}
            >
              {cashPositions.length === 0 ? (
                <option value="">No cash balances</option>
              ) : (
                cashPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Settlement amount
            <input
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-foreground outline-none transition focus:border-accent"
              name="settlementAmount"
              min="0"
              onChange={(event) => {
                setSettlementEdited(true);
                setSettlementAmount(event.target.value);
              }}
              step="any"
              type="number"
              value={settlementAmount}
            />
          </label>
        </div>
      </div>
      {state.error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-profit/40 bg-profit/10 px-3 py-2 text-sm text-profit">
          {state.success}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-11 w-fit rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : "Save asset ledger"}
    </button>
  );
}
