import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoogleAPISetupGuide() {
  return (
    <Card className="p-lg">
      <div className="space-y-md">
        <div>
          <h2 className="text-heading-lg font-bold mb-sm">Google Sheets API Setup</h2>
          <p className="text-muted-foreground">
            Follow these steps to enable Google Sheets integration. This is a one-time setup.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="step-1">
            <AccordionTrigger>
              <div className="flex items-center gap-sm">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>Step 1: Create Google Cloud Project</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-sm">
              <ol className="list-decimal list-inside space-y-sm text-body-sm">
                <li>
                  Go to{" "}
                  <Button variant="link" className="h-auto p-0" asChild>
                    <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                      Google Cloud Console <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </Button>
                </li>
                <li>Click "Select a project" → "New Project"</li>
                <li>Enter a project name (e.g., "My App Reports")</li>
                <li>Click "Create"</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-2">
            <AccordionTrigger>
              <div className="flex items-center gap-sm">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>Step 2: Enable Required APIs</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-sm">
              <ol className="list-decimal list-inside space-y-sm text-body-sm">
                <li>
                  Go to{" "}
                  <Button variant="link" className="h-auto p-0" asChild>
                    <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer">
                      API Library <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </Button>
                </li>
                <li>Search for "Google Sheets API" and click on it</li>
                <li>Click "Enable"</li>
                <li>Go back and search for "Google Picker API"</li>
                <li>Click "Enable"</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-3">
            <AccordionTrigger>
              <div className="flex items-center gap-sm">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>Step 3: Create OAuth 2.0 Client ID</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-sm">
              <ol className="list-decimal list-inside space-y-sm text-body-sm">
                <li>
                  Go to{" "}
                  <Button variant="link" className="h-auto p-0" asChild>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                      Credentials <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </Button>
                </li>
                <li>Click "Create Credentials" → "OAuth client ID"</li>
                <li>If prompted, configure OAuth consent screen first:
                  <ul className="list-disc list-inside ml-md mt-xs space-y-xs">
                    <li>Choose "External" user type</li>
                    <li>Fill in app name and support email</li>
                    <li>Add your email as test user</li>
                    <li>Save and continue through all screens</li>
                  </ul>
                </li>
                <li>Select "Web application" as application type</li>
                <li>Add authorized JavaScript origins:
                  <ul className="list-disc list-inside ml-md mt-xs">
                    <li><code className="text-metadata bg-muted px-xs py-0.5 rounded">{window.location.origin}</code></li>
                  </ul>
                </li>
                <li>Click "Create"</li>
                <li>Copy the <strong>Client ID</strong> (you'll need this below)</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-4">
            <AccordionTrigger>
              <div className="flex items-center gap-sm">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>Step 4: Create API Key</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-sm">
              <ol className="list-decimal list-inside space-y-sm text-body-sm">
                <li>
                  On the same{" "}
                  <Button variant="link" className="h-auto p-0" asChild>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                      Credentials page <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </Button>
                </li>
                <li>Click "Create Credentials" → "API key"</li>
                <li>Copy the <strong>API key</strong> (you'll need this below)</li>
                <li>(Optional) Click "Restrict Key" to limit it to Google Sheets API and Google Picker API only</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="step-5">
          <AccordionTrigger>
              <div className="flex items-center gap-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Step 5: Configure in App</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-sm">
              <p className="text-body-sm">
                Enter your credentials in the form below to complete the setup.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-lg p-md bg-muted rounded-lg">
          <h4 className="font-medium mb-sm text-body-sm">Important Notes:</h4>
          <ul className="list-disc list-inside space-y-xs text-body-sm text-muted-foreground">
            <li>Keep your API credentials secure and never share them</li>
            <li>The OAuth consent screen can be in "Testing" mode for personal use</li>
            <li>You can add more authorized origins later if needed</li>
            <li>API keys should be restricted to specific APIs for security</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
