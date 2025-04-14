import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Error verifying webhook signature:", error);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  console.log("Webhook event type:", event.type);
  console.log("Session metadata:", session?.metadata);
  console.log("Session subscription ID:", session?.subscription);

  if (event.type === "checkout.session.completed") {
    try {
      if (!session?.subscription) {
        console.error("No subscription ID found in session");
        return new NextResponse("Subscription ID is required", { status: 400 });
      }

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      console.log("Retrieved subscription:", {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        customerId: subscription.customer,
        priceId: subscription.items.data[0].price.id
      });

      if (!session?.metadata?.userId) {
        console.error("No userId found in session metadata");
        return new NextResponse("User ID is Required", { status: 400 });
      }

      // Check if subscription already exists
      const existingSubscription = await prismadb.userSubscription.findUnique({
        where: { userId: session.metadata.userId }
      });

      if (existingSubscription) {
        console.log("Updating existing subscription");
        const updatedSubscription = await prismadb.userSubscription.update({
          where: { userId: session.metadata.userId },
          data: {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
          }
        });
        console.log("Subscription updated in database:", updatedSubscription);
      } else {
        console.log("Creating new subscription for user:", session.metadata.userId);
        const createdSubscription = await prismadb.userSubscription.create({
          data: {
            userId: session.metadata.userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
          }
        });
        console.log("Subscription created in database:", createdSubscription);
      }

    } catch (error) {
      console.error("Error processing checkout.session.completed:", error);
      return new NextResponse("Error processing subscription", { status: 500 });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    try {
      if (!session?.subscription) {
        console.error("No subscription ID found in session");
        return new NextResponse("Subscription ID is required", { status: 400 });
      }

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      console.log("Updating subscription:", subscription.id);

      const updatedSubscription = await prismadb.userSubscription.update({
        where: {
          stripeSubscriptionId: subscription.id
        },
        data: {
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
        }
      });

      console.log("Subscription updated in database:", updatedSubscription);

    } catch (error) {
      console.error("Error processing invoice.payment_succeeded:", error);
      return new NextResponse("Error updating subscription", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
