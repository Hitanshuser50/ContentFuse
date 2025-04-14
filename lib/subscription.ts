import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

const DAY_IN_MS = 86_400_000;

export const checkSubscription = async () => {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    console.log("No userId found in auth result");
    return false;
  }

  console.log("Checking subscription for user:", userId);

  const userSubscription = await prismadb.userSubscription.findUnique({
    where: { userId },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true
    }
  });

  // console.log("Found subscription in database:", userSubscription);

  if (!userSubscription) {
    console.log("No subscription found for user");
    return false;
  }

  const isValid = 
    userSubscription.stripePriceId && 
    userSubscription.stripeCurrentPeriodEnd && 
    userSubscription.stripeCurrentPeriodEnd.getTime() > Date.now();

  // console.log("Subscription validity check:", {
  //   hasPriceId: !!userSubscription.stripePriceId,
  //   hasPeriodEnd: !!userSubscription.stripeCurrentPeriodEnd,
  //   periodEnd: userSubscription.stripeCurrentPeriodEnd?.toISOString(),
  //   currentTime: new Date().toISOString(),
  //   isValid
  // });

  return !!isValid;
};
