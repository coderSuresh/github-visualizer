export const profileStatsQuery = `#graphql
    query GetProfileStats(
        $login: String!
        $from: DateTime!
        $to: DateTime!
    ) {
        user(login: $login) {
            login
            name
            avatarUrl
            bio
        followers {
                totalCount
            }
        following {
                totalCount
            }
            repositories(ownerAffiliations: OWNER) {
                totalCount
            }

            contributionsCollection(from: $from, to: $to) {
                totalCommitContributions
                totalIssueContributions
                totalPullRequestContributions
                totalPullRequestReviewContributions
                totalRepositoryContributions

                totalRepositoriesWithContributedCommits
                totalRepositoriesWithContributedIssues
                totalRepositoriesWithContributedPullRequests
                totalRepositoriesWithContributedPullRequestReviews

                restrictedContributionsCount

        contributionCalendar {
                    totalContributions

            weeks {
            contributionDays {
                            date
                            contributionCount
                            contributionLevel
                        }
                    }

            months {
                        name
                        totalWeeks
                        firstDay
                    }
                }
            }
        }

    rateLimit {
            cost
            remaining
            limit
            resetAt
        }
    }`

export const commitHistoryQuery = `#graphql
    query GetCommitContributions(
    $login: String!
    $from: DateTime!
    $to: DateTime!
    ) {
    user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
        totalCommitContributions

        commitContributionsByRepository(maxRepositories: 100) {
            repository {
            nameWithOwner
            }

            contributions(first: 100) {
            nodes {
                occurredAt
                commitCount
            }
            }
        }
        }
    }

    rateLimit {
        cost
        remaining
        limit
        resetAt
    }
    }`

export const repositoryQuery = `#graphql
    query GetRepositories(
        $login: String!
        $first: Int!
        $after: String
    ) {
    user(login: $login) {
        repositories(
        first: $first
        after: $after
        ownerAffiliations: OWNER
        orderBy: {
            field: UPDATED_AT
            direction: DESC
        }
        ) {
        nodes {
            id
            name
            nameWithOwner
            description
            url

            isFork
            isArchived
            isPrivate

            stargazerCount
            forkCount

            primaryLanguage {
            name
            color
            }

            languages(
            first: 10
            orderBy: {
                field: SIZE
                direction: DESC
            }
            ) {
            totalSize

            edges {
                size

                node {
                name
                color
                }
            }
            }
        }

        pageInfo {
            hasNextPage
            endCursor
        }

        totalCount
        }
    }

    rateLimit {
        cost
        remaining
        limit
        resetAt
    }
    }`