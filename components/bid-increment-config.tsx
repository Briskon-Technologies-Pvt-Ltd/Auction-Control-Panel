"use client";

import { useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import type { BidIncrementType, BidIncrementRule, Currency } from "@/types/auction-types";

interface BidIncrementConfigProps {
  bidIncrementType: BidIncrementType;
  bidIncrementRules: BidIncrementRule[];
  currency: Currency;
  onIncrementTypeChange: (type: BidIncrementType) => void;
  onRulesChange: (rules: BidIncrementRule[]) => void;
}

export default function BidIncrementConfig({
  bidIncrementType,
  bidIncrementRules,
  currency,
  onIncrementTypeChange,
  onRulesChange,
}: BidIncrementConfigProps) {
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<BidIncrementRule>>({
    minBidAmount: 0,
    maxBidAmount: undefined,
    incrementValue: 0,
    incrementType: bidIncrementType,
  });

  const getCurrencySymbol = (currency: Currency) => {
    switch (currency) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "JPY":
        return "¥";
      case "INR":
        return "₹";
      case "AUD":
        return "A$";
      case "CAD":
        return "C$";
      case "CNY":
        return "¥";
      default:
        return "$";
    }
  };

  const handleAddRule = () => {
    if (newRule.minBidAmount !== undefined && newRule.incrementValue !== undefined) {
      const rule: BidIncrementRule = {
        id: `rule-${Date.now()}`,
        minBidAmount: newRule.minBidAmount,
        maxBidAmount: newRule.maxBidAmount,
        incrementValue: newRule.incrementValue,
        incrementType: bidIncrementType,
      };

      const updatedRules = [...bidIncrementRules, rule].sort((a, b) => a.minBidAmount - b.minBidAmount);
      onRulesChange(updatedRules);

      setNewRule({
        minBidAmount: 0,
        maxBidAmount: undefined,
        incrementValue: 0,
        incrementType: bidIncrementType,
      });
      setShowAddRule(false);
    }
  };

  const handleRemoveRule = (ruleId: string) => {
    const updatedRules = bidIncrementRules.filter((rule) => rule.id !== ruleId);
    onRulesChange(updatedRules);
  };

  const handleUpdateRule = (ruleId: string, field: keyof BidIncrementRule, value: any) => {
    const updatedRules = bidIncrementRules.map((rule) =>
      rule.id === ruleId ? { ...rule, [field]: value } : rule
    );
    onRulesChange(updatedRules);
  };

  const getIncrementTypeDescription = (type: BidIncrementType) => {
    switch (type) {
      case "fixed":
        return "Bidders must increase bids by a fixed amount";
      case "percentage":
        return "Bidders must increase bids by a percentage of current bid";
      case "range-based":
        return "Different increment rules apply based on bid amount ranges";
    }
  };

  const formatIncrementValue = (value: number, type: BidIncrementType) => {
    if (type === "percentage") {
      return `${value}%`;
    }
    return `${getCurrencySymbol(currency)}${value}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Bid Increment Strategy</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["fixed", "percentage", "range-based"] as BidIncrementType[]).map((type) => (
            <div
              key={type}
              className={`border rounded-lg p-4 cursor-pointer transition-all-smooth hover-scale 
                ${
                  bidIncrementType === type
                    ? "border-corporate-500 bg-corporate-50 dark:border-corporate-400 dark:bg-corporate-900/30"
                    : "border-gray-200 hover:border-corporate-200 dark:border-gray-700 dark:hover:border-corporate-700"
                }`}
              onClick={() => onIncrementTypeChange(type)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium dark:text-gray-100 capitalize">{type.replace("-", " ")} Increment</h4>
                <div
                  className={`w-5 h-5 rounded-full border transition-all-smooth ${
                    bidIncrementType === type
                      ? "border-corporate-500 bg-corporate-500 dark:border-corporate-400 dark:bg-corporate-400"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {bidIncrementType === type && <div className="w-full h-full rounded-full bg-white scale-50"></div>}
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{getIncrementTypeDescription(type)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration based on selected type */}
      {bidIncrementType === "fixed" && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3">Fixed Increment Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Increment Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{getCurrencySymbol(currency)}</span>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="form-input pl-7"
                  value={bidIncrementRules[0]?.incrementValue || ""}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value) || 0;
                    if (value > 0) {
                      const rule: BidIncrementRule = {
                        id: "fixed-rule",
                        minBidAmount: 0,
                        incrementValue: value,
                        incrementType: "fixed",
                      };
                      onRulesChange([rule]);
                    } else {
                      alert("Increment amount must be greater than 0.");
                    }
                  }}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {bidIncrementType === "percentage" && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 className="font-medium text-gray-800 dark:text-gray-100 mb-3">Percentage Increment Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Increment Percentage <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  className={`form-input pr-8 ${
                    !bidIncrementRules[0]?.incrementValue ||
                    bidIncrementRules[0].incrementValue < 0.1 ||
                    bidIncrementRules[0].incrementValue > 100
                      ? "border-red-500"
                      : ""
                  }`}
                  value={bidIncrementRules[0]?.incrementValue || ""}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value) || 0;
                    if (value >= 0.1 && value <= 100) {
                      const rule: BidIncrementRule = {
                        id: "percentage-rule",
                        minBidAmount: 0,
                        incrementValue: value,
                        incrementType: "percentage",
                      };
                      onRulesChange([rule]);
                    } else {
                      alert("Increment percentage must be between 0.1% and 100%.");
                    }
                  }}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
                </div>
              </div>
              {!bidIncrementRules[0]?.incrementValue ||
              bidIncrementRules[0].incrementValue < 0.1 ||
              bidIncrementRules[0].incrementValue > 100 ? (
                <p className="text-xs text-red-500 mt-1">Percentage is required and must be between 0.1% and 100%.</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex items-start">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bidders must increase their bid by at least this percentage of the current highest bid.
            </p>
          </div>
        </div>
      )}

      {bidIncrementType === "range-based" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-800 dark:text-gray-100">Range-Based Increment Rules</h4>
            <button type="button" onClick={() => setShowAddRule(true)} className="btn-primary btn-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </button>
          </div>

          {bidIncrementRules.length > 0 ? (
            <div className="space-y-3">
              {bidIncrementRules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-800 dark:text-gray-100">Rule {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="text-destructive-500 hover:text-destructive-700 dark:text-destructive-400 dark:hover:text-destructive-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Min Bid Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                            {getCurrencySymbol(currency)}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input pl-7"
                          value={rule.minBidAmount}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, "minBidAmount", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Bid Amount (Optional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                            {getCurrencySymbol(currency)}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input pl-7"
                          value={rule.maxBidAmount || ""}
                          onChange={(e) =>
                            handleUpdateRule(
                              rule.id,
                              "maxBidAmount",
                              e.target.value ? Number.parseFloat(e.target.value) : undefined
                            )
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Increment Value
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                            {getCurrencySymbol(currency)}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input pl-7"
                          value={rule.incrementValue}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, "incrementValue", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    Bids from {formatIncrementValue(rule.minBidAmount, "fixed")}
                    {rule.maxBidAmount ? ` to ${formatIncrementValue(rule.maxBidAmount, "fixed")}` : " and above"}{" "}
                    require increments of {formatIncrementValue(rule.incrementValue, "fixed")}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
              No increment rules defined. Add a rule to get started.
            </div>
          )}

          {/* Add Rule Form */}
          {showAddRule && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h5 className="font-medium text-gray-800 dark:text-gray-100 mb-3">Add New Increment Rule</h5>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Bid Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{getCurrencySymbol(currency)}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input pl-7"
                      value={newRule.minBidAmount || 0}
                      onChange={(e) =>
                        setNewRule({ ...newRule, minBidAmount: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Bid Amount (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{getCurrencySymbol(currency)}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input pl-7"
                      value={newRule.maxBidAmount || ""}
                      onChange={(e) =>
                        setNewRule({
                          ...newRule,
                          maxBidAmount: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Increment Value
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{getCurrencySymbol(currency)}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input pl-7"
                      value={newRule.incrementValue || 0}
                      onChange={(e) =>
                        setNewRule({ ...newRule, incrementValue: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAddRule(false)} className="btn-secondary btn-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddRule}
                  disabled={!newRule.minBidAmount || !newRule.incrementValue}
                  className="btn-primary btn-sm"
                >
                  Add Rule
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Bid Increment Strategy</h5>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {bidIncrementType === "fixed" &&
                "All bids must increase by the same fixed amount throughout the auction."}
              {bidIncrementType === "percentage" &&
                "Bids must increase by a percentage of the current highest bid, ensuring proportional increments."}
              {bidIncrementType === "range-based" &&
                "Different increment rules apply based on the current bid amount, allowing for more flexible bidding strategies."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
