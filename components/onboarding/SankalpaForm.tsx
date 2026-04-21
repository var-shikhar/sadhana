"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface SankalpaFormProps {
  habits: string[];
  sankalpas: Record<string, string>;
  onChange: (habitName: string, sankalpa: string) => void;
}

export function SankalpaForm({ habits, sankalpas, onChange }: SankalpaFormProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Set your Sankalpa — a firm intention of when and where you will practice
        each habit. This triples your completion rate.
      </p>
      {habits.map((habit) => (
        <Card key={habit} className="space-y-2 p-4">
          <Label className="font-medium">{habit}</Label>
          <Input
            placeholder={`e.g., "I will ${habit.toLowerCase()} at 6am in my bedroom"`}
            value={sankalpas[habit] || ""}
            onChange={(e) => onChange(habit, e.target.value)}
          />
        </Card>
      ))}
    </div>
  );
}
