"use client";

import Link from "next/link";
import { Mic, Shield, Upload, CheckCircle } from "lucide-react";
import { Button } from "@my-better-t-app/ui/components/button";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container relative mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Reliable Recording
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {" "}Pipeline
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
                A fault-tolerant audio recording system that guarantees{" "}
                <span className="font-medium text-foreground">zero data loss</span>.
                Record, chunk, and upload with complete confidence.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/recorder">
                  <Button size="lg" className="gap-2">
                    <Mic className="h-5 w-5" />
                    Start Recording
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="gap-2">
                  View Documentation
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">1. Record & Chunk</h3>
                <p className="text-sm text-muted-foreground">
                  Audio is recorded and split into 5-second chunks directly in your browser
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">2. OPFS Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Each chunk is saved to Origin Private File System before any network call
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">3. Verify & Ack</h3>
                <p className="text-sm text-muted-foreground">
                  Database acknowledgment only after bucket confirms successful upload
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                No Data Loss. Ever.
              </h2>
              <p className="text-muted-foreground mb-8">
                Our pipeline ensures your recordings are never lost. If the network drops,
                if the browser crashes, or if the bucket goes down — your data survives.
              </p>
              <div className="grid gap-4 text-left sm:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="font-medium mb-1">Auto Recovery</h3>
                  <p className="text-sm text-muted-foreground">
                    Reconciliation checks bucket/DB consistency and repairs automatically
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="font-medium mb-1">Checksum Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    SHA-256 hashes ensure data integrity from recording to storage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Built for the Swades AI Hackathon
        </div>
      </footer>
    </div>
  );
}
