import * as cdk from "aws-cdk-lib";
import * as cmg from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as lgp from "aws-cdk-lib/aws-logs";
import * as r53 from "aws-cdk-lib/aws-route53";
import * as rtg from "aws-cdk-lib/aws-route53-targets";
import * as smg from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { resolve } from "path";
import {
  backend_subdomain as backendSubdomain,
  domain_name as domainName,
} from "../../config.json";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // * =====================================
    // * Virtual Private Cloud (VPC)
    // * =====================================

    // Define the VPC and Security Group. You must define the public subnet
    // where containerized apps are deployed and the private subnet where
    // DocumentDB is deployed.
    const vpc = new ec2.Vpc(this, "VPC", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // * =====================================
    // * Route 53
    // * =====================================

    // Define the Route 53 hosted zone.
    const hostedZone = r53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    // * =====================================
    // * Certificate Manager
    // * =====================================

    const certificate = new cmg.Certificate(this, "Certificate", {
      // Domain name to be secured by the certificate
      domainName,
      // Use DNS validation for the certificate.
      validation: cmg.CertificateValidation.fromDns(hostedZone),
      // Secure all subdomains under the primary domain
      subjectAlternativeNames: [`*.${domainName}`],
    });

    // * =====================================
    // * Elastic Container Service (ECS)
    // * =====================================

    // Create ECS task definition.
    const ecsTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition"
    );

    // Create a new secret for PAYLOAD_SECRET with a random value
    const payloadSecret = new smg.Secret(this, "PayloadSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "payloadSecret",
        excludeCharacters: '"@/\\ ',
      },
    });

    // Create a log group for the ECS task.
    const logGroup = new lgp.LogGroup(this, "ECSLogGroup", {
      retention: lgp.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add a container to the task definition.
    ecsTaskDefinition.addContainer("PayloadContainer", {
      image: ecs.ContainerImage.fromAsset(
        resolve(__dirname, "..", "..", "server")
      ),
      memoryLimitMiB: 512,
      cpu: 256,
      secrets: {
        PAYLOAD_SECRET: ecs.Secret.fromSecretsManager(
          payloadSecret,
          "payloadSecret"
        ),
      },
      portMappings: [
        {
          // Expose the container port.
          containerPort: 3000,
        },
      ],
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "ecs",
        logGroup,
      }),
    });

    // Define the security group for the ECS cluster.
    const ecsSecurityGroup = new ec2.SecurityGroup(this, "ECSSecurityGroup", {
      vpc: vpc,
    });

    // Create an ECS cluster.
    const ecsCluster = new ecs.Cluster(this, "ECSCluster", { vpc });

    // Create an ECS service.
    const ecsService = new ecs.FargateService(this, "ECSService", {
      cluster: ecsCluster,
      taskDefinition: ecsTaskDefinition,
      securityGroups: [ecsSecurityGroup],
      assignPublicIp: true,
      vpcSubnets: vpc.selectSubnets({ subnetGroupName: "public" }),
    });

    // * =====================================
    // * Application Load Balancer and ECS
    // * =====================================

    // Application load balancer.
    const loadBalancer = new elb.ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc: vpc,
      internetFacing: true,
    });

    // Add a listener to the load balancer.
    const loadBalancerListener = loadBalancer.addListener("Listener", {
      port: 443,
      protocol: elb.ApplicationProtocol.HTTPS,
      certificates: [certificate],
    });

    // Add the ECS service as a target to the load balancer listener.
    loadBalancerListener.addTargets("ECS", {
      port: 3000, // The port the container is listening on.
      protocol: elb.ApplicationProtocol.HTTP, // The protocol the container is listening on.
      targets: [ecsService],
      healthCheck: {
        interval: cdk.Duration.seconds(30),
        path: "/health",
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        protocol: elb.Protocol.HTTP, // The protocol the container is listening on.
      },
    });

    // * =====================================
    // * DNS
    // * =====================================

    // DNS A record pointing to the load balancer
    new r53.ARecord(this, "BackendPayloadARecord", {
      zone: hostedZone,
      target: r53.RecordTarget.fromAlias(
        new rtg.LoadBalancerTarget(loadBalancer)
      ),
      recordName: `${backendSubdomain}.${domainName}`,
    });

    // Output the DNS name of the load balancer.
    new cdk.CfnOutput(this, "BackendPayloadURL", {
      value: loadBalancer.loadBalancerDnsName,
    });
  }
}
