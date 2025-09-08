"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shadcn/ui/card";
import { Button } from "@/shadcn/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn/ui/avatar";
import { MessageCircle, User } from "lucide-react";

export default function InterviewPrepPage() {
  const [currentMessage, setCurrentMessage] = useState(
    "Lastly, could you tell me the list of technologies you would like to cover during the interview?"
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-foreground mb-8">
          Interview generation
        </h1>

        {/* Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* AI Interviewer Card */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-foreground">
                AI Interviewer
              </h2>
            </CardContent>
          </Card>

          {/* User Card */}
          <Card className="p-8 text-center hover:shadow-lg transition-shadow">
            <CardContent className="space-y-4">
              <Avatar className="w-16 h-16 mx-auto">
                <AvatarImage src="/professional-headshot.png" />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-medium text-foreground">Adrian</h2>
            </CardContent>
          </Card>
        </div>

        {/* Message Area */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-foreground text-center leading-relaxed">
              {currentMessage}
            </p>
          </CardContent>
        </Card>

        {/* End Button */}
        <div className="flex justify-center">
          <Button
            variant="destructive"
            className="px-8 py-2 rounded-full"
            onClick={() => {
              // Handle end interview logic here
              console.log("Interview ended");
            }}
          >
            End
          </Button>
        </div>
      </div>
    </div>
  );
}
