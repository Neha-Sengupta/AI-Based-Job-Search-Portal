"use client";

import {
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  POSTED_WITHIN_DAYS,
} from "shared/constants/jobs";
import {
  COUNTRY_OPTIONS,
  JOB_TYPES,
  JOB_TYPE_LABELS,
  WORK_MODELS,
  WORK_MODEL_LABELS,
} from "shared/constants/profile";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "any";
const POSTED_LABELS = { 1: "Last 24 hours", 3: "Last 3 days", 7: "Last week", 30: "Last month" };

function CheckList({ name, legend, options, values, onToggle }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {options.map(({ value, label }) => {
        const id = `${name}-${value}`;
        return (
          <div key={value} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={values.includes(value)}
              onCheckedChange={() => onToggle(name, value)}
            />
            <Label htmlFor={id} className="font-normal">
              {label}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

// Filters live in the URL (F4.4); this component only reads `filters` and calls `onChange`.
export function JobFilters({ filters, onChange, onClear }) {
  const toggle = (name, value) => {
    const current = filters[name];
    onChange({
      [name]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="filter-country">Country</Label>
        <Select
          value={filters.country || ANY}
          onValueChange={(value) => onChange({ country: value === ANY ? "" : value })}
        >
          <SelectTrigger id="filter-country" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any country</SelectItem>
            {COUNTRY_OPTIONS.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="filter-city">City</Label>
        <Input
          id="filter-city"
          defaultValue={filters.city}
          onKeyDown={(event) =>
            event.key === "Enter" && onChange({ city: event.currentTarget.value.trim() })
          }
          onBlur={(event) =>
            event.target.value.trim() !== filters.city &&
            onChange({ city: event.target.value.trim() })
          }
          placeholder="e.g. Bengaluru"
        />
      </div>
      <CheckList
        name="workModel"
        legend="Work model"
        values={filters.workModel}
        onToggle={toggle}
        options={WORK_MODELS.map((value) => ({ value, label: WORK_MODEL_LABELS[value] }))}
      />
      <CheckList
        name="jobType"
        legend="Job type"
        values={filters.jobType}
        onToggle={toggle}
        options={JOB_TYPES.map((value) => ({ value, label: JOB_TYPE_LABELS[value] }))}
      />
      <CheckList
        name="experienceLevel"
        legend="Experience level"
        values={filters.experienceLevel}
        onToggle={toggle}
        options={EXPERIENCE_LEVELS.filter((level) => level !== "unknown").map((value) => ({
          value,
          label: EXPERIENCE_LEVEL_LABELS[value],
        }))}
      />
      <div className="space-y-1.5">
        <Label htmlFor="filter-posted">Posted</Label>
        <Select
          value={filters.postedWithin || ANY}
          onValueChange={(value) => onChange({ postedWithin: value === ANY ? "" : value })}
        >
          <SelectTrigger id="filter-posted" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any time</SelectItem>
            {POSTED_WITHIN_DAYS.map((days) => (
              <SelectItem key={days} value={days}>
                {POSTED_LABELS[days]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" className="w-full" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
